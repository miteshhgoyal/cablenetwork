// backend/src/routes/subscribers.js
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

// ==========================================
// NEW: ACTIVATE SUBSCRIBER (Fresh/Inactive → Active)
// ==========================================
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

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        const { subscriberName, macAddress, serialNumber, status, expiryDate, packages } = req.body; // ✅ Changed from 'package' to 'packages'

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

        // Validation
        if (!subscriberName || !macAddress || !serialNumber) {
            return res.status(400).json({
                success: false,
                message: 'Name, MAC address, and serial number are required'
            });
        }

        // ✅ Validate packages array
        if (!packages || !Array.isArray(packages) || packages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one package must be selected'
            });
        }

        // Check if MAC address already exists
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

        // Update basic fields
        subscriber.subscriberName = subscriberName.trim();
        subscriber.macAddress = macAddress.trim().toLowerCase();
        subscriber.serialNumber = serialNumber.trim();
        subscriber.status = status || 'Active';

        if (expiryDate) {
            subscriber.expiryDate = new Date(expiryDate);
        }

        // ✅ Update packages array
        subscriber.packages = packages;

        // ✅ Update primary package if needed
        if (!subscriber.primaryPackageId || !packages.includes(subscriber.primaryPackageId.toString())) {
            subscriber.primaryPackageId = packages[0]; // Set first package as primary
        }

        await subscriber.save();

        // Populate and return
        await subscriber.populate('resellerId', 'name email');
        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        res.json({
            success: true,
            message: 'Subscriber updated successfully',
            data: { subscriber }
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

        await subscriber.deleteOne();

        res.json({
            success: true,
            message: 'Subscriber deleted successfully'
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
