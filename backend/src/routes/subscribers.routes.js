// FIXED VERSION - subscribers.routes.js
// This file contains ALL balance deduction fixes

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
 * Check if user has permission to access subscriber
 */
async function checkSubscriberPermission(userId, subscriber) {
    const user = await User.findById(userId);

    if (user.role === 'admin') {
        return true;
    }

    if (user.role === 'distributor') {
        if (!subscriber.resellerId) return false;
        const reseller = await User.findById(subscriber.resellerId);
        return reseller && reseller.createdBy && reseller.createdBy.toString() === userId;
    }

    if (user.role === 'reseller') {
        return subscriber.resellerId && subscriber.resellerId.toString() === userId;
    }

    return false;
}

/**
 * 🔧 FIXED: Centralized balance calculation and deduction
 * Handles all scenarios: activation, renewal, package changes, expiry extension
 */
async function calculateAndDeductBalance(resellerId, options = {}) {
    const {
        oldPackages = [],           // Current package IDs (as strings)
        newPackages = [],           // New package IDs (as strings)
        oldExpiryDate = null,       // Current expiry date
        newExpiryDate = null,       // New expiry date
        isInitialActivation = false, // Is this first-time activation?
        isReactivation = false,     // Is this reactivation from Inactive/Expired?
        skipBalanceCheck = false    // Admin bypass
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

    // Fetch reseller
    const reseller = await User.findById(resellerId);
    if (!reseller) {
        return {
            success: false,
            error: 'Reseller not found'
        };
    }

    // ========================================
    // SCENARIO 1: INITIAL ACTIVATION
    // Fresh subscriber → Active with packages
    // ========================================
    if (isInitialActivation && newPackages.length > 0) {
        const packageDocs = await Package.find({ _id: { $in: newPackages } });
        const activationCost = packageDocs.reduce((sum, pkg) => sum + pkg.cost, 0);

        chargeBreakdown.activationCharge = activationCost;
        totalCharges += activationCost;
    }

    // ========================================
    // SCENARIO 2: REACTIVATION
    // Inactive/Expired → Active
    // ========================================
    else if (isReactivation && newPackages.length > 0) {
        const packageDocs = await Package.find({ _id: { $in: newPackages } });
        const reactivationCost = packageDocs.reduce((sum, pkg) => sum + pkg.cost, 0);

        chargeBreakdown.reactivationCharge = reactivationCost;
        totalCharges += reactivationCost;
    }

    // ========================================
    // SCENARIO 3: PACKAGE ADDITION
    // Adding new packages to active subscriber
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
    // Extending expiry date (adding more days/months)
    // ========================================
    if (newExpiryDate && oldExpiryDate && newPackages.length > 0) {
        const now = new Date();
        const newExpiry = new Date(newExpiryDate);
        const oldExpiry = new Date(oldExpiryDate);

        // Only charge if extending FUTURE (beyond current expiry)
        if (newExpiry > oldExpiry) {
            const extensionDays = Math.ceil((newExpiry - oldExpiry) / (1000 * 60 * 60 * 24));

            if (extensionDays > 0) {
                const packageDocs = await Package.find({ _id: { $in: newPackages } });

                // Calculate pro-rated charges for each package
                let extensionCost = 0;
                for (const pkg of packageDocs) {
                    const packageDuration = pkg.duration || 30; // Default 30 days
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
        // Round to 2 decimal places
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
                _id: resellerId,
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

    // No charges required
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

    // Find the longest duration among packages
    const longestDuration = Math.max(...packages.map(pkg => pkg.duration || 30));

    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + longestDuration);
    expiryDate.setHours(23, 59, 59, 999); // End of day

    return expiryDate;
}

// ==========================================
// ROUTES
// ==========================================

/**
 * GET ALL SUBSCRIBERS
 * With role-based filtering
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
            // Distributor sees subscribers of their resellers
            const resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            }).select('_id');
            const resellerIds = resellers.map(r => r._id);
            query.resellerId = { $in: resellerIds };
        } else if (currentUser.role === 'reseller') {
            // Reseller sees only their subscribers
            query.resellerId = userId;
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
                { serialNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const subscribers = await Subscriber.find(query)
            .populate('resellerId', 'name email')
            .populate('packages', 'name cost duration')
            .populate('primaryPackageId', 'name cost duration')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { subscribers }
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
 * GET SINGLE SUBSCRIBER
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriber = await Subscriber.findById(req.params.id)
            .populate('resellerId', 'name email balance')
            .populate('packages', 'name cost duration')
            .populate('primaryPackageId', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        res.json({
            success: true,
            data: { subscriber }
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
 * Properly handles balance deduction for initial activation
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
            resellerId
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

        // Determine reseller ID based on role
        let finalResellerId = null;
        if (currentUser.role === 'admin') {
            finalResellerId = resellerId || null;
        } else if (currentUser.role === 'distributor') {
            if (resellerId) {
                const reseller = await User.findById(resellerId);
                if (!reseller || reseller.role !== 'reseller' ||
                    reseller.createdBy.toString() !== userId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Invalid reseller selection'
                    });
                }
                finalResellerId = resellerId;
            }
        } else if (currentUser.role === 'reseller') {
            finalResellerId = userId;
        }

        // 🔧 FIX: Determine if this is an activation requiring balance deduction
        const isActivation = status === 'Active' && packages.length > 0;
        let finalExpiryDate = null;
        let balanceResult = null;

        // 🔧 FIX: Handle activation with balance deduction
        if (isActivation && finalResellerId) {
            // Get package details for expiry calculation
            const packageDocs = await Package.find({ _id: { $in: packages } });

            if (packageDocs.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid packages selected'
                });
            }

            // Calculate expiry date if not provided
            if (expiryDate) {
                finalExpiryDate = new Date(expiryDate + 'T23:59:59');
            } else {
                finalExpiryDate = calculateExpiryDate(packageDocs);
            }

            // 🔧 FIX: Calculate and deduct balance for activation
            balanceResult = await calculateAndDeductBalance(finalResellerId, {
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

        // Create subscriber
        const subscriber = new Subscriber({
            subscriberName: subscriberName.trim(),
            macAddress: macAddress.trim().toLowerCase(),
            serialNumber: serialNumber.trim(),
            status: isActivation ? 'Active' : status,
            expiryDate: finalExpiryDate,
            packages: packages,
            primaryPackageId: primaryPackageId || (packages.length > 0 ? packages[0] : null),
            resellerId: finalResellerId
        });

        await subscriber.save();

        await subscriber.populate('resellerId', 'name email balance');
        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Subscriber created and activated successfully. ${balanceResult.message}`
            : 'Subscriber created successfully';

        res.status(201).json({
            success: true,
            message: responseMessage,
            data: {
                subscriber,
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
 * Handles balance deduction for package changes and validity extensions
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
            .populate('resellerId', 'name email balance')
            .populate('packages', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
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

        // 🔧 FIX: Prepare for balance calculation
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
            // Auto-calculate if no expiry exists
            const packageDocs = await Package.find({ _id: { $in: packages } });
            finalExpiryDate = calculateExpiryDate(packageDocs);
        }

        // 🔧 FIX: Calculate and deduct balance for changes
        let balanceResult = null;

        if (subscriber.resellerId) {
            balanceResult = await calculateAndDeductBalance(subscriber.resellerId, {
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

        // Update status if provided, otherwise set based on packages
        if (status) {
            subscriber.status = status;
        } else if (packages.length > 0) {
            subscriber.status = 'Active';
        } else {
            subscriber.status = 'Fresh';
        }

        // Update primary package if needed
        if (!subscriber.primaryPackageId || !packages.includes(subscriber.primaryPackageId.toString())) {
            subscriber.primaryPackageId = packages[0];
        }

        await subscriber.save();

        await subscriber.populate('resellerId', 'name email balance');
        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Subscriber updated successfully. ${balanceResult.message}`
            : 'Subscriber updated successfully';

        res.json({
            success: true,
            message: responseMessage,
            data: {
                subscriber,
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
 * Handles balance deduction for reactivation scenarios
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
            .populate('resellerId', 'name email balance')
            .populate('packages', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // 🔧 FIX: Check if this is a reactivation requiring balance deduction
        const currentStatus = subscriber.status;
        const isReactivation = (currentStatus === 'Inactive' || currentStatus === 'Expired' || currentStatus === 'Fresh')
            && newStatus === 'Active';

        // Validation for activation
        if (newStatus === 'Active') {
            if (!subscriber.packages || subscriber.packages.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot activate subscriber without packages. Please add packages first.'
                });
            }

            if (!subscriber.expiryDate || new Date(subscriber.expiryDate) < new Date()) {
                // Auto-set expiry date if missing or expired
                const newExpiryDate = calculateExpiryDate(subscriber.packages);
                subscriber.expiryDate = newExpiryDate;
            }
        }

        // 🔧 FIX: Handle balance deduction for reactivation
        let balanceResult = null;

        if (isReactivation && subscriber.resellerId) {
            const packageIds = subscriber.packages.map(p => p._id.toString());

            balanceResult = await calculateAndDeductBalance(subscriber.resellerId, {
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

        // Update status
        subscriber.status = newStatus;
        await subscriber.save();

        await subscriber.populate('resellerId', 'name email balance');
        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        const responseMessage = balanceResult && balanceResult.chargedAmount > 0
            ? `Status updated to ${newStatus}. ${balanceResult.message}`
            : `Status updated to ${newStatus} successfully`;

        res.json({
            success: true,
            message: responseMessage,
            data: {
                subscriber,
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
 * DELETE SUBSCRIBER
 * Admin: Permanently delete
 * Reseller: Release MAC (set to Fresh, remove reseller)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('resellerId', 'name email');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Admin can permanently delete
        if (currentUser.role === 'admin') {
            await subscriber.deleteOne();
            return res.json({
                success: true,
                message: 'Subscriber deleted successfully'
            });
        }

        // Reseller/Distributor: Release MAC (make it reusable)
        subscriber.status = 'Fresh';
        subscriber.resellerId = null;
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
 * BULK UPLOAD SUBSCRIBERS
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

                const newSubscriber = new Subscriber({
                    subscriberName: subscriberName.trim(),
                    macAddress: macAddress.trim().toLowerCase(),
                    serialNumber: serialNumber.trim(),
                    status: 'Fresh',
                    resellerId: null,
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

export default router;