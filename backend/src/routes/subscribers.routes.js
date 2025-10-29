import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Subscriber from '../models/Subscriber.js';
import User from '../models/User.js';

const router = express.Router();

// Get all subscribers (role-based filtering)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status, resellerId } = req.query;
        const userId = req.user.id;
        const user = await User.findById(userId);

        let query = {};

        // Role-based filtering
        switch (user.role) {
            case 'admin':
                // Admin can see all subscribers
                break;

            case 'distributor':
                // Distributor sees only their resellers' subscribers
                const distributorResellers = await User.find({
                    role: 'reseller',
                    createdBy: userId
                });
                const resellerIds = distributorResellers.map(r => r._id);
                query.resellerId = { $in: resellerIds };
                break;

            case 'reseller':
                // Reseller sees only their own subscribers
                query.resellerId = userId;
                break;

            default:
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access'
                });
        }

        // Add status filter
        if (status) {
            query.status = status;
        }

        // Add reseller filter (for admin/distributor)
        if (resellerId && ['admin', 'distributor'].includes(user.role)) {
            query.resellerId = resellerId;
        }

        // FIXED: Add search filter - properly combine with existing query using $and
        if (search) {
            const searchConditions = {
                $or: [
                    { subscriberName: { $regex: search, $options: 'i' } },
                    { macAddress: { $regex: search, $options: 'i' } },
                    { serialNumber: { $regex: search, $options: 'i' } }
                ]
            };

            // If query already has conditions, combine with $and
            if (Object.keys(query).length > 0) {
                query = { $and: [query, searchConditions] };
            } else {
                query = searchConditions;
            }
        }

        const subscribers = await Subscriber.find(query)
            .populate('resellerId', 'name email')
            .populate('package', 'name cost duration')
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

// Get resellers list (for filter dropdown)
router.get('/resellers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        let resellers = [];

        if (user.role === 'admin') {
            // Admin can see all resellers
            resellers = await User.find({ role: 'reseller' })
                .select('name email')
                .sort({ name: 1 });
        } else if (user.role === 'distributor') {
            // Distributor sees only their resellers
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

// Get single subscriber details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        const subscriber = await Subscriber.findById(req.params.id)
            .populate('resellerId', 'name email phone')
            .populate('package', 'name cost duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Check access permissions
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

export default router;
