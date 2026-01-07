import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Subscriber from '../models/Subscriber.js';
import User from '../models/User.js';
import Package from '../models/Package.js';

const router = express.Router();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * 🔧 FIXED: Check if user has permission to access subscriber
 * Based on subscriber's partnerCode (not resellerId)
 */
async function checkSubscriberPermission(userId, subscriber) {
    const user = await User.findById(userId);

    // Admin has access to all subscribers
    if (user.role === 'admin') {
        return true;
    }

    // 🔧 FIXED: Reseller can access subscribers who used their partner code
    if (user.role === 'reseller') {
        // Match user's partnerCode with subscriber's partnerCode
        return subscriber.partnerCode && subscriber.partnerCode === user.partnerCode;
    }

    // 🔧 FIXED: Distributor can access subscribers whose partnerCode belongs to their resellers
    if (user.role === 'distributor') {
        if (!subscriber.partnerCode) return false;

        // Find reseller with this partnerCode who was created by this distributor
        const reseller = await User.findOne({
            partnerCode: subscriber.partnerCode,
            role: 'reseller',
            createdBy: userId
        });

        return reseller !== null;
    }

    return false;
}

/**
 * 🔧 FIXED: Centralized balance calculation and deduction
 * Uses partnerCode to find the correct reseller (not resellerId)
 */
async function calculateAndDeductBalance(partnerCode, options = {}) {
    const {
        oldPackages = [],
        newPackages = [],
        oldExpiryDate = null,
        newExpiryDate = null,
        isInitialActivation = false,
        isReactivation = false,
        skipBalanceCheck = false
    } = options;

    let totalCharges = 0;
    let chargeBreakdown = {
        activationCharge: 0,
        newPackagesCharge: 0,
        validityExtensionCharge: 0,
        reactivationCharge: 0
    };

    // Skip all checks for admin
    if (skipBalanceCheck) {
        return {
            success: true,
            chargedAmount: 0,
            remainingBalance: null,
            breakdown: chargeBreakdown,
            message: 'Admin operation - no charges'
        };
    }

    // 🔧 FIXED: Find reseller by partnerCode (not by resellerId)
    const reseller = await User.findOne({ partnerCode: partnerCode, role: 'reseller' });
    if (!reseller) {
        return {
            success: false,
            error: 'Reseller not found for partner code'
        };
    }

    // ========================================
    // SCENARIO 1: INITIAL ACTIVATION
    // ========================================
    if (isInitialActivation && newPackages.length > 0) {
        const packageDocs = await Package.find({ _id: { $in: newPackages } });
        const activationCost = packageDocs.reduce((sum, pkg) => sum + pkg.cost, 0);

        chargeBreakdown.activationCharge = activationCost;
        totalCharges += activationCost;
    }

    // ========================================
    // SCENARIO 2: REACTIVATION
    // ========================================
    else if (isReactivation && newPackages.length > 0) {
        const packageDocs = await Package.find({ _id: { $in: newPackages } });
        const reactivationCost = packageDocs.reduce((sum, pkg) => sum + pkg.cost, 0);

        chargeBreakdown.reactivationCharge = reactivationCost;
        totalCharges += reactivationCost;
    }

    // ========================================
    // SCENARIO 3: PACKAGE ADDITION
    // ========================================
    else if (!isInitialActivation && !isReactivation) {
        const addedPackageIds = newPackages.filter(id => !oldPackages.includes(id));

        if (addedPackageIds.length > 0) {
            const addedPackageDocs = await Package.find({ _id: { $in: addedPackageIds } });
            const additionCost = addedPackageDocs.reduce((sum, pkg) => sum + pkg.cost, 0);

            chargeBreakdown.newPackagesCharge = additionCost;
            totalCharges += additionCost;
        }
    }

    // ========================================
    // SCENARIO 4: VALIDITY EXTENSION
    // ========================================
    if (newExpiryDate && oldExpiryDate && newPackages.length > 0) {
        const now = new Date();
        const newExpiry = new Date(newExpiryDate);
        const oldExpiry = new Date(oldExpiryDate);

        if (newExpiry > oldExpiry) {
            const extensionDays = Math.ceil((newExpiry - oldExpiry) / (1000 * 60 * 60 * 24));

            if (extensionDays > 0) {
                const packageDocs = await Package.find({ _id: { $in: newPackages } });

                let extensionCost = 0;
                for (const pkg of packageDocs) {
                    const packageDuration = pkg.duration || 30;
                    const dailyRate = pkg.cost / packageDuration;
                    const packageExtensionCost = dailyRate * extensionDays;
                    extensionCost += packageExtensionCost;
                }

                chargeBreakdown.validityExtensionCharge = extensionCost;
                totalCharges += extensionCost;
            }
        }
    }

    // ========================================
    // BALANCE CHECK AND DEDUCTION
    // ========================================
    if (totalCharges > 0) {
        totalCharges = Math.round(totalCharges * 100) / 100;

        if (reseller.balance < totalCharges) {
            return {
                success: false,
                error: `Insufficient balance. Required: Rs.${totalCharges.toFixed(2)}, Available: Rs.${reseller.balance.toFixed(2)}`,
                requiredAmount: totalCharges,
                availableBalance: reseller.balance
            };
        }

        // Deduct balance using atomic operation
        const updatedReseller = await User.findOneAndUpdate(
            {
                _id: reseller._id,
                balance: { $gte: totalCharges }
            },
            {
                $inc: { balance: -totalCharges }
            },
            { new: true }
        );

        if (!updatedReseller) {
            return {
                success: false,
                error: 'Failed to deduct balance. Please try again.'
            };
        }

        return {
            success: true,
            chargedAmount: totalCharges,
            remainingBalance: updatedReseller.balance,
            breakdown: chargeBreakdown,
            message: `Rs.${totalCharges.toFixed(2)} deducted successfully`
        };
    }

    return {
        success: true,
        chargedAmount: 0,
        remainingBalance: reseller.balance,
        breakdown: chargeBreakdown,
        message: 'No charges required'
    };
}

/**
 * Calculate expiry date based on packages
 */
function calculateExpiryDate(packages, baseDate = null) {
    if (!packages || packages.length === 0) {
        return null;
    }

    const startDate = baseDate ? new Date(baseDate) : new Date();
    const longestDuration = Math.max(...packages.map(pkg => pkg.duration || 30));

    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + longestDuration);
    expiryDate.setHours(23, 59, 59, 999);

    return expiryDate;
}

// ==========================================
// ROUTES
// ==========================================

/**
 * 🔧 FIXED: GET ALL SUBSCRIBERS
 * With role-based filtering using partnerCode (not resellerId)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { status, search } = req.query;

        let query = {};

        // Role-based filtering
        if (currentUser.role === 'admin') {
            // Admin sees all subscribers
        } else if (currentUser.role === 'distributor') {
            // 🔧 FIXED: Distributor sees subscribers whose partnerCode belongs to their resellers
            const resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            }).select('partnerCode');

            const partnerCodes = resellers.map(r => r.partnerCode).filter(pc => pc);
            query.partnerCode = { $in: partnerCodes };
        } else if (currentUser.role === 'reseller') {
            // 🔧 FIXED: Reseller sees only subscribers who used their partner code
            query.partnerCode = currentUser.partnerCode;
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Search filter
        if (search) {
            query.$or = [
                { subscriberName: { $regex: search, $options: 'i' } },
                { macAddress: { $regex: search, $options: 'i' } },
                { serialNumber: { $regex: search, $options: 'i' } },
                { partnerCode: { $regex: search, $options: 'i' } }  // 🔧 ADDED: Search by partnerCode
            ];
        }

        // 🔧 FIXED: Populate reseller info using partnerCode lookup
        const subscribers = await Subscriber.find(query)
            .populate('packages', 'name cost duration')
            .populate('primaryPackageId', 'name cost duration')
            .sort({ createdAt: -1 });

        // 🔧 FIXED: Manually populate reseller info based on partnerCode
        const subscribersWithReseller = await Promise.all(
            subscribers.map(async (sub) => {
                const subObj = sub.toObject();
                if (sub.partnerCode) {
                    const reseller = await User.findOne(
                        { partnerCode: sub.partnerCode, role: 'reseller' },
                        'name email balance partnerCode'
                    );
                    subObj.resellerInfo = reseller || null;
                } else {
                    subObj.resellerInfo = null;
                }
                return subObj;
            })
        );

        res.json({
            success: true,
            data: { subscribers: subscribersWithReseller }
        });

    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscribers'
        });
    }
});

/**
 * 🔧 FIXED: GET SINGLE SUBSCRIBER
 * With partnerCode-based authorization
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration')
            .populate('primaryPackageId', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // 🔧 FIXED: Check permission based on subscriber's partnerCode
        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: This subscriber used a different partner code'
            });
        }

        // 🔧 FIXED: Populate reseller info using partnerCode
        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        res.json({
            success: true,
            data: { subscriber: subObj }
        });

    } catch (error) {
        console.error('Get subscriber error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriber'
        });
    }
});

/**
 * 🔧 FIXED: CREATE SUBSCRIBER
 * Now properly stores partnerCode and uses it for reseller lookup
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        const {
            subscriberName,
            macAddress,
            serialNumber,
            status = 'Fresh',
            expiryDate,
            packages = [],
            primaryPackageId,
            partnerCode  // 🔧 PRIMARY: Accept partnerCode (not resellerId)
        } = req.body;

        // Validation
        if (!subscriberName || !macAddress || !serialNumber) {
            return res.status(400).json({
                success: false,
                message: 'Name, MAC address, and serial number are required'
            });
        }

        // Check MAC address uniqueness
        const existingSubscriber = await Subscriber.findOne({
            macAddress: macAddress.trim().toLowerCase()
        });

        if (existingSubscriber) {
            return res.status(400).json({
                success: false,
                message: 'MAC address already exists'
            });
        }

        // 🔧 FIXED: Determine reseller and partnerCode based on role
        let finalResellerId = null;
        let finalPartnerCode = null;

        if (currentUser.role === 'admin') {
            // Admin must provide partnerCode
            if (partnerCode) {
                const reseller = await User.findOne({ partnerCode: partnerCode, role: 'reseller' });
                if (reseller) {
                    finalResellerId = reseller._id;
                    finalPartnerCode = partnerCode;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid partner code'
                    });
                }
            }
            // If no partnerCode provided, create as Fresh (no reseller assignment)
        } else if (currentUser.role === 'distributor') {
            if (partnerCode) {
                // Verify partnerCode belongs to distributor's reseller
                const reseller = await User.findOne({
                    partnerCode: partnerCode,
                    role: 'reseller',
                    createdBy: userId
                });

                if (!reseller) {
                    return res.status(403).json({
                        success: false,
                        message: 'Invalid partner code - not under your distributorship'
                    });
                }

                finalResellerId = reseller._id;
                finalPartnerCode = partnerCode;
            }
        } else if (currentUser.role === 'reseller') {
            // Reseller creates subscriber with their own partnerCode
            finalResellerId = userId;
            finalPartnerCode = currentUser.partnerCode;
        }

        // Determine if this is an activation
        const isActivation = status === 'Active' && packages.length > 0;
        let finalExpiryDate = null;
        let balanceResult = null;

        // Handle activation with balance deduction
        if (isActivation && finalPartnerCode) {
            const packageDocs = await Package.find({ _id: { $in: packages } });

            if (packageDocs.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid packages selected'
                });
            }

            if (expiryDate) {
                finalExpiryDate = new Date(expiryDate + 'T23:59:59');
            } else {
                finalExpiryDate = calculateExpiryDate(packageDocs);
            }

            // 🔧 FIXED: Use partnerCode for balance deduction
            balanceResult = await calculateAndDeductBalance(finalPartnerCode, {
                newPackages: packages,
                newExpiryDate: finalExpiryDate,
                isInitialActivation: true,
                skipBalanceCheck: currentUser.role === 'admin'
            });

            if (!balanceResult.success) {
                return res.status(400).json({
                    success: false,
                    message: balanceResult.error
                });
            }
        }

        // 🔧 FIXED: Create subscriber with partnerCode as primary field
        const subscriber = new Subscriber({
            subscriberName: subscriberName.trim(),
            macAddress: macAddress.trim().toLowerCase(),
            serialNumber: serialNumber.trim(),
            status: isActivation ? 'Active' : status,
            expiryDate: finalExpiryDate,
            packages: packages,
            primaryPackageId: primaryPackageId || (packages.length > 0 ? packages[0] : null),
            resellerId: finalResellerId,  // Still store for backward compatibility
            partnerCode: finalPartnerCode  // 🔧 PRIMARY FIELD
        });

        await subscriber.save();

        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        // 🔧 FIXED: Populate reseller info using partnerCode
        const subObj = subscriber.toObject();
        if (finalPartnerCode) {
            const reseller = await User.findOne(
                { partnerCode: finalPartnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Subscriber created and activated successfully. ${balanceResult.message}`
            : 'Subscriber created successfully';

        res.status(201).json({
            success: true,
            message: responseMessage,
            data: {
                subscriber: subObj,
                chargedAmount: balanceResult ? balanceResult.chargedAmount : 0,
                remainingBalance: balanceResult ? balanceResult.remainingBalance : null
            }
        });

    } catch (error) {
        console.error('Create subscriber error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create subscriber'
        });
    }
});

/**
 * 🔧 FIXED: UPDATE SUBSCRIBER
 * Authorization based on subscriber's partnerCode
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        const {
            subscriberName,
            macAddress,
            serialNumber,
            status,
            expiryDate,
            packages
        } = req.body;

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // 🔧 FIXED: Check permission based on subscriber's partnerCode
        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only update subscribers who used your partner code'
            });
        }

        // Validation
        if (!subscriberName || !macAddress || !serialNumber) {
            return res.status(400).json({
                success: false,
                message: 'Name, MAC address, and serial number are required'
            });
        }

        if (!packages || !Array.isArray(packages) || packages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one package must be selected'
            });
        }

        // Check MAC address uniqueness
        const existingSubscriber = await Subscriber.findOne({
            macAddress: macAddress.trim().toLowerCase(),
            _id: { $ne: req.params.id }
        });

        if (existingSubscriber) {
            return res.status(400).json({
                success: false,
                message: 'MAC address already exists'
            });
        }

        // Prepare for balance calculation
        const oldPackageIds = subscriber.packages.map(p => p._id.toString());
        const newPackageIds = packages;
        const oldExpiryDate = subscriber.expiryDate;

        // Handle expiry date
        let finalExpiryDate = oldExpiryDate;
        if (expiryDate) {
            const newExpiryDate = new Date(expiryDate + 'T23:59:59');
            const now = new Date();

            if (newExpiryDate < now) {
                return res.status(400).json({
                    success: false,
                    message: 'Expiry date cannot be in the past'
                });
            }

            finalExpiryDate = newExpiryDate;
        } else if (!finalExpiryDate && packages.length > 0) {
            const packageDocs = await Package.find({ _id: { $in: packages } });
            finalExpiryDate = calculateExpiryDate(packageDocs);
        }

        // 🔧 FIXED: Calculate and deduct balance using partnerCode
        let balanceResult = null;

        if (subscriber.partnerCode) {
            balanceResult = await calculateAndDeductBalance(subscriber.partnerCode, {
                oldPackages: oldPackageIds,
                newPackages: newPackageIds,
                oldExpiryDate: oldExpiryDate,
                newExpiryDate: finalExpiryDate,
                isInitialActivation: false,
                isReactivation: false,
                skipBalanceCheck: currentUser.role === 'admin'
            });

            if (!balanceResult.success) {
                return res.status(400).json({
                    success: false,
                    message: balanceResult.error
                });
            }
        }

        // Update subscriber fields
        subscriber.subscriberName = subscriberName.trim();
        subscriber.macAddress = macAddress.trim().toLowerCase();
        subscriber.serialNumber = serialNumber.trim();
        subscriber.expiryDate = finalExpiryDate;
        subscriber.packages = packages;

        if (status) {
            subscriber.status = status;
        } else if (packages.length > 0) {
            subscriber.status = 'Active';
        } else {
            subscriber.status = 'Fresh';
        }

        if (!subscriber.primaryPackageId || !packages.includes(subscriber.primaryPackageId.toString())) {
            subscriber.primaryPackageId = packages[0];
        }

        await subscriber.save();

        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        // 🔧 FIXED: Populate reseller info using partnerCode
        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Subscriber updated successfully. ${balanceResult.message}`
            : 'Subscriber updated successfully';

        res.json({
            success: true,
            message: responseMessage,
            data: {
                subscriber: subObj,
                chargedAmount: balanceResult ? balanceResult.chargedAmount : 0,
                remainingBalance: balanceResult ? balanceResult.remainingBalance : null,
                breakdown: balanceResult ? balanceResult.breakdown : null
            }
        });

    } catch (error) {
        console.error('Update subscriber error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subscriber'
        });
    }
});

/**
 * 🔧 FIXED: UPDATE SUBSCRIBER STATUS
 * Authorization based on subscriber's partnerCode
 */
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { status: newStatus } = req.body;

        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['Active', 'Inactive', 'Expired', 'Fresh'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // 🔧 FIXED: Check permission based on subscriber's partnerCode
        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only update subscribers who used your partner code'
            });
        }

        const currentStatus = subscriber.status;
        const isReactivation = (currentStatus === 'Inactive' || currentStatus === 'Expired' || currentStatus === 'Fresh')
            && newStatus === 'Active';

        if (newStatus === 'Active') {
            if (!subscriber.packages || subscriber.packages.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot activate subscriber without packages. Please add packages first.'
                });
            }

            if (!subscriber.expiryDate || new Date(subscriber.expiryDate) < new Date()) {
                const newExpiryDate = calculateExpiryDate(subscriber.packages);
                subscriber.expiryDate = newExpiryDate;
            }
        }

        // 🔧 FIXED: Handle balance deduction using partnerCode
        let balanceResult = null;

        if (isReactivation && subscriber.partnerCode) {
            const packageIds = subscriber.packages.map(p => p._id.toString());

            balanceResult = await calculateAndDeductBalance(subscriber.partnerCode, {
                newPackages: packageIds,
                newExpiryDate: subscriber.expiryDate,
                isReactivation: true,
                skipBalanceCheck: currentUser.role === 'admin'
            });

            if (!balanceResult.success) {
                return res.status(400).json({
                    success: false,
                    message: balanceResult.error
                });
            }
        }

        subscriber.status = newStatus;
        await subscriber.save();

        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        // 🔧 FIXED: Populate reseller info using partnerCode
        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Status updated to ${newStatus}. ${balanceResult.message}`
            : `Status updated to ${newStatus} successfully`;

        res.json({
            success: true,
            message: responseMessage,
            data: {
                subscriber: subObj,
                chargedAmount: balanceResult ? balanceResult.chargedAmount : 0,
                remainingBalance: balanceResult ? balanceResult.remainingBalance : null
            }
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

/**
 * 🔧 FIXED: DELETE SUBSCRIBER
 * Authorization based on subscriber's partnerCode
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        const subscriber = await Subscriber.findById(req.params.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // 🔧 FIXED: Check permission based on subscriber's partnerCode
        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only delete subscribers who used your partner code'
            });
        }

        if (currentUser.role === 'admin') {
            await subscriber.deleteOne();
            return res.json({
                success: true,
                message: 'Subscriber deleted successfully'
            });
        }

        // Reseller/Distributor: Release MAC
        subscriber.status = 'Fresh';
        subscriber.resellerId = null;
        subscriber.partnerCode = null;  // 🔧 ALSO CLEAR PARTNER CODE
        subscriber.expiryDate = null;
        subscriber.packages = [];
        subscriber.primaryPackageId = null;
        await subscriber.save();

        res.json({
            success: true,
            message: 'MAC released and returned to Admin. It is now unassigned and reusable.'
        });

    } catch (error) {
        console.error('Delete subscriber error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete subscriber'
        });
    }
});

/**
 * 🔧 FIXED: BULK UPLOAD SUBSCRIBERS
 * No partnerCode assignment for bulk upload
 */
router.post('/bulk-upload', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        if (currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can perform bulk uploads'
            });
        }

        const { subscribers } = req.body;

        if (!subscribers || !Array.isArray(subscribers) || subscribers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscribers data'
            });
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const sub of subscribers) {
            try {
                const { subscriberName, macAddress, serialNumber } = sub;

                if (!subscriberName || !macAddress || !serialNumber) {
                    results.failed.push({
                        data: sub,
                        reason: 'Missing required fields'
                    });
                    continue;
                }

                const existingSubscriber = await Subscriber.findOne({
                    macAddress: macAddress.trim().toLowerCase()
                });

                if (existingSubscriber) {
                    results.failed.push({
                        data: sub,
                        reason: 'MAC address already exists'
                    });
                    continue;
                }

                // 🔧 FIXED: Bulk upload creates Fresh subscribers with no partnerCode
                const newSubscriber = new Subscriber({
                    subscriberName: subscriberName.trim(),
                    macAddress: macAddress.trim().toLowerCase(),
                    serialNumber: serialNumber.trim(),
                    status: 'Fresh',
                    resellerId: null,
                    partnerCode: null,  // 🔧 NO PARTNER CODE FOR BULK UPLOAD
                    packages: [],
                    expiryDate: null
                });

                await newSubscriber.save();
                results.successful.push(newSubscriber);

            } catch (error) {
                results.failed.push({
                    data: sub,
                    reason: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk upload completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
            data: results
        });

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk upload'
        });
    }
});

// GET RESELLERS LIST (for dropdowns)
router.get('/resellers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        let resellers = [];

        if (user.role === 'admin') {
            resellers = await User.find({ role: 'reseller' })
                .select('name email partnerCode')
                .sort({ name: 1 });
        } else if (user.role === 'distributor') {
            resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            })
                .select('name email partnerCode')
                .sort({ name: 1 });
        }

        res.json({
            success: true,
            data: { resellers }
        });

    } catch (error) {
        console.error('Get resellers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resellers'
        });
    }
});

// GET PACKAGES LIST (for dropdowns)
router.get('/packages', authenticateToken, async (req, res) => {
    try {
        const packages = await Package.find()
            .select('name cost duration')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: { packages }
        });

    } catch (error) {
        console.error('Get packages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch packages'
        });
    }
});

// ACTIVATE SUBSCRIBER
router.patch('/:id/activate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { expiryDate } = req.body;

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // 🔧 FIXED: Check permission based on subscriber's partnerCode
        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only activate subscribers who used your partner code'
            });
        }

        if (!subscriber.packages || subscriber.packages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot activate subscriber without packages'
            });
        }

        // Calculate expiry date
        let finalExpiryDate;
        if (expiryDate) {
            finalExpiryDate = new Date(expiryDate + 'T23:59:59');
        } else {
            finalExpiryDate = calculateExpiryDate(subscriber.packages);
        }

        // 🔧 FIXED: Handle balance deduction using partnerCode
        let balanceResult = null;

        if (subscriber.partnerCode) {
            const packageIds = subscriber.packages.map(p => p._id.toString());

            balanceResult = await calculateAndDeductBalance(subscriber.partnerCode, {
                newPackages: packageIds,
                newExpiryDate: finalExpiryDate,
                isInitialActivation: true,
                skipBalanceCheck: currentUser.role === 'admin'
            });

            if (!balanceResult.success) {
                return res.status(400).json({
                    success: false,
                    message: balanceResult.error
                });
            }
        }

        subscriber.status = 'Active';
        subscriber.expiryDate = finalExpiryDate;
        await subscriber.save();

        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        // 🔧 FIXED: Populate reseller info using partnerCode
        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Subscriber activated successfully. ${balanceResult.message}`
            : 'Subscriber activated successfully';

        res.json({
            success: true,
            message: responseMessage,
            data: {
                subscriber: subObj,
                chargedAmount: balanceResult ? balanceResult.chargedAmount : 0,
                remainingBalance: balanceResult ? balanceResult.remainingBalance : null
            }
        });

    } catch (error) {
        console.error('Activate subscriber error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate subscriber'
        });
    }
});

// RENEW PACKAGE
router.patch('/:id/renew', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { duration } = req.body;

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // 🔧 FIXED: Check permission based on subscriber's partnerCode
        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only renew subscribers who used your partner code'
            });
        }

        if (!duration || duration <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid duration is required'
            });
        }

        if (!subscriber.packages || subscriber.packages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No packages assigned to subscriber'
            });
        }

        // Calculate new expiry date
        const currentExpiry = subscriber.expiryDate ? new Date(subscriber.expiryDate) : new Date();
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiryDate = new Date(baseDate.getTime() + duration * 24 * 60 * 60 * 1000);

        // 🔧 FIXED: Handle balance deduction using partnerCode
        let balanceResult = null;

        if (subscriber.partnerCode) {
            const packageIds = subscriber.packages.map(p => p._id.toString());

            balanceResult = await calculateAndDeductBalance(subscriber.partnerCode, {
                newPackages: packageIds,
                oldExpiryDate: subscriber.expiryDate,
                newExpiryDate: newExpiryDate,
                skipBalanceCheck: currentUser.role === 'admin'
            });

            if (!balanceResult.success) {
                return res.status(400).json({
                    success: false,
                    message: balanceResult.error
                });
            }
        }

        subscriber.status = 'Active';
        subscriber.expiryDate = newExpiryDate;
        await subscriber.save();

        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        // 🔧 FIXED: Populate reseller info using partnerCode
        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Package renewed successfully. ${balanceResult.message}`
            : 'Package renewed successfully';

        res.json({
            success: true,
            message: responseMessage,
            data: {
                subscriber: subObj,
                chargedAmount: balanceResult ? balanceResult.chargedAmount : 0,
                remainingBalance: balanceResult ? balanceResult.remainingBalance : null,
                newExpiryDate: newExpiryDate
            }
        });

    } catch (error) {
        console.error('Renew package error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to renew package'
        });
    }
});

export default router;