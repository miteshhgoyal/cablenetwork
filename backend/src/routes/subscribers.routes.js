import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Subscriber from '../models/Subscriber.js';
import User from '../models/User.js';
import Package from '../models/Package.js';

const router = express.Router();

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

// ACTIVATE SUBSCRIBER
router.patch('/:id/activate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        const { expiryDate } = req.body;

        const subscriber = await Subscriber.findById(req.params.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Check permissions
        if (user.role === 'reseller' && subscriber.resellerId.toString() !== userId) {
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

            if (!resellerIds.includes(subscriber.resellerId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
            }
        }

        // Activate the subscriber
        subscriber.status = 'Active';

        // Set expiry date if provided, otherwise default to 30 days
        if (expiryDate) {
            subscriber.expiryDate = new Date(expiryDate);
        } else {
            subscriber.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        await subscriber.save();

        await subscriber.populate('resellerId', 'name email');
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
        const user = await User.findById(userId);
        const { duration } = req.body;

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration')
            .populate('primaryPackageId', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Check permissions
        if (user.role === 'reseller' && subscriber.resellerId.toString() !== userId) {
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

            if (!resellerIds.includes(subscriber.resellerId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
            }
        }

        // Validate duration
        if (!duration || duration <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid duration is required'
            });
        }

        // Calculate renewal cost based on all packages
        const totalPackageCost = subscriber.packages.reduce((sum, pkg) => sum + pkg.cost, 0);

        // Check reseller balance
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

        // Atomically deduct balance
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

        // Calculate new expiry date
        const currentExpiry = subscriber.expiryDate ? new Date(subscriber.expiryDate) : new Date();
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;

        const newExpiryDate = new Date(baseDate.getTime() + duration * 24 * 60 * 60 * 1000);

        subscriber.expiryDate = newExpiryDate;
        subscriber.status = 'Active';

        await subscriber.save();

        await subscriber.populate('resellerId', 'name email');
        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        res.json({
            success: true,
            message: `Package renewed successfully. Rs.${totalPackageCost} deducted from balance.`,
            data: {
                subscriber,
                deductedAmount: totalPackageCost,
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

// UPDATE SUBSCRIBER
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        const { subscriberName, macAddress, serialNumber, status, expiryDate, packages } = req.body;

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Check permissions
        if (user.role === 'reseller' && subscriber.resellerId.toString() !== userId) {
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

            if (!resellerIds.includes(subscriber.resellerId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
            }
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

        // Validate expiry date
        if (expiryDate) {
            const newExpiryDate = new Date(expiryDate);
            const currentExpiryDate = subscriber.expiryDate ? new Date(subscriber.expiryDate) : null;

            if (currentExpiryDate && newExpiryDate < currentExpiryDate) {
                return res.status(400).json({
                    success: false,
                    message: 'New expiry date cannot be before the current expiry date'
                });
            }
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

        // Deduct balance if cost increased
        if (costDifference > 0) {
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

        // Auto-activate if packages are assigned and status is Fresh/Inactive
        if (packages && packages.length > 0 && (subscriber.status === 'Fresh' || subscriber.status === 'Inactive')) {
            subscriber.status = 'Active';
            console.log(`Auto-activating subscriber ${req.params.id} due to package assignment`);
        } else if (status) {
            subscriber.status = status;
        }

        if (expiryDate) {
            subscriber.expiryDate = new Date(expiryDate);
        }

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
        const user = await User.findById(userId);

        const subscriber = await Subscriber.findById(req.params.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Check permissions
        if (user.role === 'reseller' && subscriber.resellerId.toString() !== userId) {
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

            if (!resellerIds.includes(subscriber.resellerId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
            }
        }

        // If admin, allow true deletion
        if (user.role === 'admin') {
            await subscriber.deleteOne();
            return res.json({
                success: true,
                message: 'Subscriber deleted successfully'
            });
        }

        // Dealer/Reseller: Release MAC instead of deleting
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
