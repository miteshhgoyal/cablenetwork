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

    if (user.role === 'reseller') {
        return subscriber.partnerCode && subscriber.partnerCode === user.partnerCode;
    }

    if (user.role === 'distributor') {
        if (!subscriber.partnerCode) return false;

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
 * 🔧 UPDATED: Now uses pkg.costPerDay instead of calculating cost/duration
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

    // Admin: no deduction
    if (skipBalanceCheck) {
        return {
            success: true,
            chargedAmount: 0,
            remainingBalance: null,
            breakdown: chargeBreakdown,
            message: 'Admin operation - no charges'
        };
    }

    const reseller = await User.findOne({ partnerCode, role: 'reseller' });
    if (!reseller) {
        return {
            success: false,
            error: 'Reseller not found for partner code'
        };
    }

    const normalizedOldPackages = oldPackages.map(id => id.toString());
    const normalizedNewPackages = newPackages.map(id => id.toString());

    // utility to clamp days
    const diffInDays = (d1, d2) => {
        const ms = d2.getTime() - d1.getTime();
        const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    };

    // SCENARIO 1: INITIAL ACTIVATION
    if (isInitialActivation && normalizedNewPackages.length > 0 && newExpiryDate) {
        const packageDocs = await Package.find({ _id: { $in: normalizedNewPackages } });

        const now = new Date();
        const expiryDate = new Date(newExpiryDate);
        const daysToAdd = diffInDays(now, expiryDate);

        if (daysToAdd > 0) {
            let activationCost = 0;
            for (const pkg of packageDocs) {
                // 🔧 UPDATED: Use stored costPerDay
                const dailyRate = pkg.costPerDay;
                activationCost += dailyRate * daysToAdd;

                console.log(
                    `📦 Activation charge for ${pkg.name}: ${dailyRate} × ${daysToAdd} = ₹${(dailyRate * daysToAdd).toFixed(2)}`
                );
            }

            chargeBreakdown.activationCharge = activationCost;
            totalCharges += activationCost;
        }
    }

    // SCENARIO 2: REACTIVATION
    else if (isReactivation && normalizedNewPackages.length > 0 && newExpiryDate) {
        const packageDocs = await Package.find({ _id: { $in: normalizedNewPackages } });

        const now = new Date();
        const expiryDate = new Date(newExpiryDate);
        const daysToAdd = diffInDays(now, expiryDate);

        if (daysToAdd > 0) {
            let reactivationCost = 0;
            for (const pkg of packageDocs) {
                // 🔧 UPDATED: Use stored costPerDay
                const dailyRate = pkg.costPerDay;
                reactivationCost += dailyRate * daysToAdd;

                console.log(
                    `📦 Reactivation charge for ${pkg.name}: ${dailyRate} × ${daysToAdd} = ₹${(dailyRate * daysToAdd).toFixed(2)}`
                );
            }

            chargeBreakdown.reactivationCharge = reactivationCost;
            totalCharges += reactivationCost;
        }
    }

    // SCENARIO 3: UPDATE (extension + package changes)
    else if (!isInitialActivation && !isReactivation) {
        let hasValidityExtension = false;
        let extensionDays = 0;

        if (newExpiryDate && oldExpiryDate) {
            const newExpiry = new Date(newExpiryDate);
            const oldExpiry = new Date(oldExpiryDate);

            extensionDays = diffInDays(oldExpiry, newExpiry);
            hasValidityExtension = extensionDays > 0;
        }

        const removedPackageIds = normalizedOldPackages.filter(
            id => !normalizedNewPackages.includes(id)
        );
        const addedPackageIds = normalizedNewPackages.filter(
            id => !normalizedOldPackages.includes(id)
        );
        const remainingPackageIds = normalizedNewPackages.filter(
            id => normalizedOldPackages.includes(id)
        );

        console.log('🔍 Package Analysis:');
        console.log('Old packages:', normalizedOldPackages);
        console.log('New packages:', normalizedNewPackages);
        console.log('Removed:', removedPackageIds);
        console.log('Added:', addedPackageIds);
        console.log('Remaining:', remainingPackageIds);
        console.log('Validity extension:', hasValidityExtension, 'days:', extensionDays);

        // CHARGE 1: extension on remaining packages
        if (hasValidityExtension && remainingPackageIds.length > 0) {
            const remainingPackageDocs = await Package.find({
                _id: { $in: remainingPackageIds }
            });

            let extensionCost = 0;
            for (const pkg of remainingPackageDocs) {
                // 🔧 UPDATED: Use stored costPerDay
                const dailyRate = pkg.costPerDay;
                const packageExtensionCost = dailyRate * extensionDays;
                extensionCost += packageExtensionCost;

                console.log(
                    `📦 Extension charge for ${pkg.name}: ${dailyRate} × ${extensionDays} = ₹${packageExtensionCost.toFixed(2)}`
                );
            }

            chargeBreakdown.validityExtensionCharge = extensionCost;
            totalCharges += extensionCost;
        }

        // CHARGE 2: newly added packages for remaining validity
        if (addedPackageIds.length > 0 && newExpiryDate) {
            const addedPackageDocs = await Package.find({
                _id: { $in: addedPackageIds }
            });

            const now = new Date();
            const expiryDate = new Date(newExpiryDate);
            const remainingDays = diffInDays(now, expiryDate);

            if (remainingDays > 0) {
                let additionCost = 0;
                for (const pkg of addedPackageDocs) {
                    // 🔧 UPDATED: Use stored costPerDay
                    const dailyRate = pkg.costPerDay;
                    const packageCost = dailyRate * remainingDays;
                    additionCost += packageCost;

                    console.log(
                        `📦 New package charge for ${pkg.name}: ${dailyRate} × ${remainingDays} = ₹${packageCost.toFixed(2)}`
                    );
                }

                chargeBreakdown.newPackagesCharge = additionCost;
                totalCharges += additionCost;
            }
        }

        // removed: no refund
    }

    // BALANCE CHECK
    if (totalCharges > 0) {
        totalCharges = Math.round(totalCharges * 100) / 100;

        console.log('💰 Total charges:', totalCharges);

        if (reseller.balance < totalCharges) {
            return {
                success: false,
                error: `Insufficient balance. Required: Rs.${totalCharges.toFixed(
                    2
                )}, Available: Rs.${reseller.balance.toFixed(2)}`,
                requiredAmount: totalCharges,
                availableBalance: reseller.balance
            };
        }

        const updatedReseller = await User.findOneAndUpdate(
            {
                _id: reseller._id,
                balance: { $gte: totalCharges }
            },
            { $inc: { balance: -totalCharges } },
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

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { status, search } = req.query;

        let query = {};

        if (currentUser.role === 'admin') {
            // Admin sees all
        } else if (currentUser.role === 'distributor') {
            const resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            }).select('partnerCode');

            const partnerCodes = resellers.map(r => r.partnerCode).filter(pc => pc);
            query.partnerCode = { $in: partnerCodes };
        } else if (currentUser.role === 'reseller') {
            query.partnerCode = currentUser.partnerCode;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { subscriberName: { $regex: search, $options: 'i' } },
                { macAddress: { $regex: search, $options: 'i' } },
                { serialNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const subscribers = await Subscriber.find(query)
            .populate('packages', 'name cost duration costPerDay')
            .populate('primaryPackageId', 'name cost duration costPerDay')
            .sort({ createdAt: -1 });

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
            partnerCode
        } = req.body;

        if (!subscriberName || !macAddress || !serialNumber) {
            return res.status(400).json({
                success: false,
                message: 'Name, MAC address, and serial number are required'
            });
        }

        const existingSubscriber = await Subscriber.findOne({
            macAddress: macAddress.trim().toLowerCase()
        });

        if (existingSubscriber) {
            return res.status(400).json({
                success: false,
                message: 'MAC address already exists'
            });
        }

        let finalResellerId = null;
        let finalPartnerCode = null;

        if (currentUser.role === 'admin') {
            if (partnerCode) {
                const reseller = await User.findOne({ partnerCode, role: 'reseller' });
                if (!reseller) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid partner code'
                    });
                }
                finalResellerId = reseller._id;
                finalPartnerCode = partnerCode;
            }
        } else if (currentUser.role === 'distributor') {
            if (partnerCode) {
                const reseller = await User.findOne({
                    partnerCode,
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
            finalResellerId = userId;
            finalPartnerCode = currentUser.partnerCode;
        }

        const isActivation = status === 'Active' && packages.length > 0;
        let finalExpiryDate = null;
        let balanceResult = null;

        if (isActivation && finalPartnerCode) {
            const packageDocs = await Package.find({ _id: { $in: packages } });

            if (packageDocs.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid packages selected'
                });
            }

            if (expiryDate) {
                const d = new Date(expiryDate);
                if (isNaN(d.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid expiry date'
                    });
                }
                d.setHours(23, 59, 59, 999);
                finalExpiryDate = d;
            } else {
                finalExpiryDate = calculateExpiryDate(packageDocs);
            }

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

        const subscriber = new Subscriber({
            subscriberName: subscriberName.trim(),
            macAddress: macAddress.trim().toLowerCase(),
            serialNumber: serialNumber.trim(),
            status: isActivation ? 'Active' : status,
            expiryDate: finalExpiryDate,
            packages,
            primaryPackageId: primaryPackageId || (packages.length > 0 ? packages[0] : null),
            resellerId: finalResellerId,
            partnerCode: finalPartnerCode
        });

        await subscriber.save();

        await subscriber.populate('packages', 'name cost duration costPerDay');
        await subscriber.populate('primaryPackageId', 'name cost duration costPerDay');

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

        const responseMessage =
            balanceResult && balanceResult.chargedAmount > 0
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
                    partnerCode: null,
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

router.get('/packages', authenticateToken, async (req, res) => {
    try {
        const packages = await Package.find()
            .select('name cost duration costPerDay')
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

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration costPerDay')
            .populate('primaryPackageId', 'name cost duration costPerDay');

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
                message: 'Unauthorized: This subscriber used a different partner code'
            });
        }

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
            .populate('packages', 'name cost duration costPerDay');

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
                message: 'Unauthorized: You can only update subscribers who used your partner code'
            });
        }

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

        const oldPackageIds = subscriber.packages.map(p => p._id.toString());
        const newPackageIds = packages.map(id => id.toString());
        const oldExpiryDate = subscriber.expiryDate;

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
        } else if (packages.length > 0 && !oldExpiryDate) {
            const packageDocs = await Package.find({ _id: { $in: packages } });
            finalExpiryDate = calculateExpiryDate(packageDocs);
        }

        let balanceResult = null;

        if (subscriber.partnerCode) {
            balanceResult = await calculateAndDeductBalance(subscriber.partnerCode, {
                oldPackages: oldPackageIds,
                newPackages: newPackageIds,
                oldExpiryDate: oldExpiryDate,
                newExpiryDate: finalExpiryDate,
                skipBalanceCheck: currentUser.role === 'admin'
            });

            if (!balanceResult.success) {
                return res.status(400).json({
                    success: false,
                    message: balanceResult.error
                });
            }
        }

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

        await subscriber.populate('packages', 'name cost duration costPerDay');
        await subscriber.populate('primaryPackageId', 'name cost duration costPerDay');

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
            .populate('packages', 'name cost duration costPerDay');

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

        await subscriber.populate('packages', 'name cost duration costPerDay');
        await subscriber.populate('primaryPackageId', 'name cost duration costPerDay');

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

        subscriber.status = 'Fresh';
        subscriber.resellerId = null;
        subscriber.partnerCode = null;
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

router.patch('/:id/activate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { expiryDate } = req.body;

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration costPerDay');

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
                message: 'Unauthorized: You can only activate subscribers who used your partner code'
            });
        }

        if (subscriber.status !== 'Fresh' || subscriber.expiryDate) {
            return res.status(400).json({
                success: false,
                message: 'Use status or renew routes for reactivation/extension, not initial activate'
            });
        }

        if (!subscriber.packages || subscriber.packages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot activate subscriber without packages'
            });
        }

        let finalExpiryDate;
        if (expiryDate) {
            const d = new Date(expiryDate);
            if (isNaN(d.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expiry date'
                });
            }
            d.setHours(23, 59, 59, 999);
            finalExpiryDate = d;
        } else {
            finalExpiryDate = calculateExpiryDate(subscriber.packages);
        }

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

        await subscriber.populate('packages', 'name cost duration costPerDay');
        await subscriber.populate('primaryPackageId', 'name cost duration costPerDay');

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

        const responseMessage =
            balanceResult && balanceResult.chargedAmount > 0
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

router.patch('/:id/renew', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { duration } = req.body;

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration costPerDay');

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

        const currentExpiry = subscriber.expiryDate ? new Date(subscriber.expiryDate) : new Date();
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiryDate = new Date(baseDate.getTime() + duration * 24 * 60 * 60 * 1000);
        newExpiryDate.setHours(23, 59, 59, 999);

        let balanceResult = null;

        if (subscriber.partnerCode) {
            const packageIds = subscriber.packages.map(p => p._id.toString());

            balanceResult = await calculateAndDeductBalance(subscriber.partnerCode, {
                oldPackages: packageIds,
                newPackages: packageIds,
                oldExpiryDate: subscriber.expiryDate,
                newExpiryDate,
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

        await subscriber.populate('packages', 'name cost duration costPerDay');
        await subscriber.populate('primaryPackageId', 'name cost duration costPerDay');

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

        const responseMessage =
            balanceResult && balanceResult.chargedAmount > 0
                ? `Package renewed successfully. ${balanceResult.message}`
                : 'Package renewed successfully';

        res.json({
            success: true,
            message: responseMessage,
            data: {
                subscriber: subObj,
                chargedAmount: balanceResult ? balanceResult.chargedAmount : 0,
                remainingBalance: balanceResult ? balanceResult.remainingBalance : null,
                newExpiryDate
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