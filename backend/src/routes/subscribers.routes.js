import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Subscriber from '../models/Subscriber.js';
import User from '../models/User.js';
import Package from '../models/Package.js';

const router = express.Router();

// Move helper to TOP (before routes)
async function checkSubscriberPermission(userId, subscriber) {
    const user = await User.findById(userId);

    if (user.role === 'admin') return true;

    if (user.role === 'reseller' && subscriber.resellerId && subscriber.resellerId._id.toString() === userId) {
        return true;
    }

    if (user.role === 'distributor') {
        const distributorResellers = await User.find({
            role: 'reseller',
            createdBy: userId
        });
        const resellerIds = distributorResellers.map(r => r._id.toString());
        return subscriber.resellerId && resellerIds.includes(subscriber.resellerId._id.toString());
    }

    return false;
}

// GET ALL SUBSCRIBERS
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status, resellerId } = req.query;
        const userId = req.user.id;
        const user = await User.findById(userId);

        let query = {};

        switch (user.role) {
            case 'admin':
                break;
            case 'distributor':
                const distributorResellers = await User.find({
                    role: 'reseller',
                    createdBy: userId
                });
                const resellerIds = distributorResellers.map(r => r._id);
                query.resellerId = { $in: resellerIds };
                break;
            case 'reseller':
                query.resellerId = userId;
                break;
            default:
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
        }

        if (status) query.status = status;
        if (resellerId && ['admin', 'distributor'].includes(user.role)) {
            query.resellerId = resellerId;
        }

        if (search) {
            const searchConditions = {
                $or: [
                    { subscriberName: { $regex: search, $options: 'i' } },
                    { macAddress: { $regex: search, $options: 'i' } },
                    { serialNumber: { $regex: search, $options: 'i' } }
                ]
            };

            if (Object.keys(query).length > 0) {
                query = { $and: [query, searchConditions] };
            } else {
                query = searchConditions;
            }
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

// GET RESELLERS LIST
router.get('/resellers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        let resellers = [];

        if (user.role === 'admin') {
            resellers = await User.find({ role: 'reseller' })
                .select('name email')
                .sort({ name: 1 });
        } else if (user.role === 'distributor') {
            resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            })
                .select('name email')
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

// GET PACKAGES LIST
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

// GET SINGLE SUBSCRIBER
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('resellerId', 'name email phone')
            .populate('packages', 'name cost duration')
            .populate('primaryPackageId', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Check permissions
        if (user.role === 'reseller' && subscriber.resellerId._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        if (user.role === 'distributor') {
            const distributorResellers = await User.find({
                role: 'reseller',
                createdBy: userId
            });
            const resellerIds = distributorResellers.map(r => r._id.toString());

            if (!resellerIds.includes(subscriber.resellerId._id.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
            }
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

// ACTIVATE - Populate BEFORE permission check
router.patch('/:id/activate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { expiryDate } = req.body;

        // Populate resellerId FIRST for permission check
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

        subscriber.status = 'Active';
        subscriber.expiryDate = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await subscriber.save();

        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        res.json({
            success: true,
            message: 'Subscriber activated successfully',
            data: { subscriber }
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
        const { duration } = req.body;

        // Populate resellerId FIRST for permission check
        const subscriber = await Subscriber.findById(req.params.id)
            .populate('resellerId', 'name email')
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

        const totalPackageCost = subscriber.packages.reduce((sum, pkg) => sum + pkg.cost, 0);

        if (subscriber.resellerId && totalPackageCost > 0) {
            const reseller = await User.findById(subscriber.resellerId);
            if (!reseller) {
                return res.status(404).json({
                    success: false,
                    message: 'Reseller not found'
                });
            }

            if (reseller.balance < totalPackageCost) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Required: Rs.${totalPackageCost}, Available: Rs.${reseller.balance}`
                });
            }

            const updatedReseller = await User.findOneAndUpdate(
                {
                    _id: subscriber.resellerId,
                    balance: { $gte: totalPackageCost }
                },
                {
                    $inc: { balance: -totalPackageCost }
                },
                { new: true }
            );

            if (!updatedReseller) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to deduct balance. Insufficient funds.'
                });
            }
        }

        subscriber.status = 'Active';

        const currentExpiry = subscriber.expiryDate ? new Date(subscriber.expiryDate) : new Date();
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;

        const newExpiryDate = new Date(baseDate.getTime() + duration * 24 * 60 * 60 * 1000);
        subscriber.expiryDate = newExpiryDate;

        await subscriber.save();

        const deductedAmount = subscriber.resellerId ? totalPackageCost : 0;

        res.json({
            success: true,
            message: `Package renewed successfully.${deductedAmount > 0 ? ` Rs.${deductedAmount} deducted from balance.` : ''}`,
            data: {
                subscriber,
                deductedAmount,
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

// UPDATE SUBSCRIBER - Complete date validation fix
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { subscriberName, macAddress, serialNumber, status, expiryDate, packages } = req.body;

        // Populate resellerId FIRST for permission check
        const subscriber = await Subscriber.findById(req.params.id)
            .populate('resellerId', 'name email')
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

        // Improved expiry date validation
        let finalExpiryDate = subscriber.expiryDate;
        if (expiryDate) {
            const newExpiryDate = new Date(expiryDate + 'T23:59:59'); // End of day
            const now = new Date();
            const currentExpiryDate = subscriber.expiryDate ? new Date(subscriber.expiryDate) : now;

            // Allow ANY future date OR same day (handles auto-calculate edge case)
            if (newExpiryDate < now) {
                return res.status(400).json({
                    success: false,
                    message: 'Expiry date cannot be in the past'
                });
            }

            // Only block if significantly earlier than current (allow same day)
            const timeDiff = currentExpiryDate.getTime() - newExpiryDate.getTime();
            if (timeDiff > 24 * 60 * 60 * 1000) { // More than 1 day earlier
                return res.status(400).json({
                    success: false,
                    message: 'New expiry date cannot be more than 1 day before current expiry date'
                });
            }

            finalExpiryDate = newExpiryDate;
        }

        // Calculate cost difference
        const oldPackageIds = subscriber.packages.map(p => p._id.toString());
        const newPackageIds = packages;

        const addedPackageIds = newPackageIds.filter(id => !oldPackageIds.includes(id));
        const removedPackageIds = oldPackageIds.filter(id => !newPackageIds.includes(id));

        let costDifference = 0;

        if (addedPackageIds.length > 0 || removedPackageIds.length > 0) {
            const addedPackages = await Package.find({ _id: { $in: addedPackageIds } });
            const addedCost = addedPackages.reduce((sum, pkg) => sum + pkg.cost, 0);

            const removedCost = subscriber.packages
                .filter(p => removedPackageIds.includes(p._id.toString()))
                .reduce((sum, pkg) => sum + pkg.cost, 0);

            costDifference = addedCost - removedCost;
        }

        // Deduct balance if cost increased (skip for admin)
        if (costDifference > 0 && subscriber.resellerId) {
            const reseller = await User.findById(subscriber.resellerId);

            if (!reseller) {
                return res.status(404).json({
                    success: false,
                    message: 'Reseller not found'
                });
            }

            if (reseller.balance < costDifference) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Required: Rs.${costDifference}, Available: Rs.${reseller.balance}`
                });
            }

            const updatedReseller = await User.findOneAndUpdate(
                {
                    _id: subscriber.resellerId,
                    balance: { $gte: costDifference }
                },
                {
                    $inc: { balance: -costDifference }
                },
                { new: true }
            );

            if (!updatedReseller) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to deduct balance. Insufficient funds.'
                });
            }
        }

        // Update subscriber fields
        subscriber.subscriberName = subscriberName.trim();
        subscriber.macAddress = macAddress.trim().toLowerCase();
        subscriber.serialNumber = serialNumber.trim();

        if (packages && packages.length > 0) {
            subscriber.status = 'Active';
        } else if (status) {
            subscriber.status = status;
        } else {
            subscriber.status = 'Fresh';
        }

        subscriber.expiryDate = finalExpiryDate;
        subscriber.packages = packages;

        if (!subscriber.primaryPackageId || !packages.includes(subscriber.primaryPackageId.toString())) {
            subscriber.primaryPackageId = packages[0];
        }

        await subscriber.save();

        await subscriber.populate('resellerId', 'name email');
        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        res.json({
            success: true,
            message: costDifference > 0
                ? `Subscriber updated successfully. Rs.${costDifference} deducted from balance.`
                : 'Subscriber updated successfully',
            data: { subscriber, deductedAmount: costDifference }
        });

    } catch (error) {
        console.error('Update subscriber error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subscriber'
        });
    }
});

// DELETE SUBSCRIBER
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

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

        if (req.user.role === 'admin') {
            await subscriber.deleteOne();
            return res.json({
                success: true,
                message: 'Subscriber deleted successfully'
            });
        }

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

export default router;
