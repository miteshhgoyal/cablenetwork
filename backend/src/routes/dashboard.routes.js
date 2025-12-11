// backend/src/routes/dashboard.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Channel from '../models/Channel.js';
import Package from '../models/Package.js';
import Subscriber from '../models/Subscriber.js';
import Ott from '../models/Ott.js';
import Credit from '../models/Credit.js';

const router = express.Router();

// Get Dashboard Overview with Role-Based Stats
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let dashboardData = {
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                balance: user.balance,
                status: user.status,
                partnerCode: user.partnerCode,
                createdAt: user.createdAt
            },
            stats: {}
        };

        // Role-based stats calculation
        switch (user.role) {
            case 'admin':
                // Admin sees everything (global stats)
                const [
                    totalCategories,
                    totalChannels,
                    totalPackages,
                    totalOtt,
                    totalSubscribers,
                    totalDistributors,
                    totalResellers,
                    activeSubscribers,
                    inactiveSubscribers
                ] = await Promise.all([
                    Category.countDocuments(),
                    Channel.countDocuments(),
                    Package.countDocuments(),
                    Ott.countDocuments(),
                    Subscriber.countDocuments(),
                    User.countDocuments({ role: 'distributor' }),
                    User.countDocuments({ role: 'reseller' }),
                    Subscriber.countDocuments({ status: 'Active' }),
                    Subscriber.countDocuments({ status: 'Inactive' })
                ]);

                dashboardData.stats = {
                    totalCategories,
                    totalChannels,
                    totalPackages,
                    totalOtt,
                    totalSubscribers,
                    totalDistributors,
                    totalResellers,
                    activeSubscribers,
                    inactiveSubscribers,
                    totalRevenue: 0 // Can be calculated from Credit model
                };
                break;

            case 'distributor':
                // Distributor sees only their resellers and their subscribers
                const distributorResellers = await User.find({
                    role: 'reseller',
                    createdBy: userId
                });

                const resellerIds = distributorResellers.map(r => r._id);

                const [
                    distributorCategories,
                    distributorChannels,
                    distributorPackages,
                    distributorOtt,
                    distributorSubscribers,
                    distributorActiveSubscribers
                ] = await Promise.all([
                    Category.countDocuments(),
                    Channel.countDocuments(),
                    Package.countDocuments(),
                    Ott.countDocuments(),
                    // FIXED: Use resellerId instead of resellerName
                    Subscriber.countDocuments({
                        resellerId: { $in: resellerIds }
                    }),
                    Subscriber.countDocuments({
                        resellerId: { $in: resellerIds },
                        status: 'Active'
                    })
                ]);

                dashboardData.stats = {
                    totalResellers: distributorResellers.length,
                    totalCategories: distributorCategories,
                    totalChannels: distributorChannels,
                    totalPackages: distributorPackages,
                    totalOtt: distributorOtt,
                    totalSubscribers: distributorSubscribers,
                    activeSubscribers: distributorActiveSubscribers,
                    inactiveSubscribers: distributorSubscribers - distributorActiveSubscribers
                };
                break;

            case 'reseller':
                // Reseller sees only their own subscribers and packages
                // FIXED: Use resellerId instead of resellerName
                const [
                    resellerSubscribers,
                    resellerActiveSubscribers,
                    resellerInactiveSubscribers,
                    resellerFreshSubscribers
                ] = await Promise.all([
                    Subscriber.countDocuments({ resellerId: userId }),
                    Subscriber.countDocuments({ resellerId: userId, status: 'Active' }),
                    Subscriber.countDocuments({ resellerId: userId, status: 'Inactive' }),
                    Subscriber.countDocuments({ resellerId: userId, status: 'Fresh' })
                ]);

                dashboardData.stats = {
                    totalSubscribers: resellerSubscribers,
                    activeSubscribers: resellerActiveSubscribers,
                    inactiveSubscribers: resellerInactiveSubscribers,
                    freshSubscribers: resellerFreshSubscribers,
                    totalPackages: user.packages?.length || 0,
                    subscriberLimit: user.subscriberLimit || 0,
                    availableSlots: (user.subscriberLimit || 0) - resellerSubscribers
                };
                break;

            default:
                return res.status(403).json({
                    success: false,
                    message: 'Invalid user role'
                });
        }

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
});

// Get Recent Activities (role-based)
router.get('/activities', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        let activities = [];

        // Fetch recent credits based on role
        if (user.role === 'admin') {
            activities = await Credit.find()
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .limit(10);
        } else {
            activities = await Credit.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(10);
        }

        res.json({
            success: true,
            data: { activities }
        });

    } catch (error) {
        console.error('Dashboard activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
});

// Export complete database backup (ADMIN ONLY)
router.get('/backup', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // Only admins can export full database
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required for database export'
            });
        }

        // Fetch ALL data with populated references
        const [
            users,
            categories,
            channels,
            packages,
            subscribers,
            otts,
            credits
        ] = await Promise.all([
            // Users without password
            User.find().select('-password -resetPasswordToken -resetPasswordExpires'),
            Category.find().lean(),
            Channel.find().populate('language genre').lean(),
            Package.find().populate('genres channels').lean(),
            Subscriber.find().populate('resellerId packages primaryPackageId').lean(),
            Ott.find().populate('genre language').lean(),
            Credit.find().populate('user', 'name email').lean()
        ]);

        // Create backup object with metadata
        const backupData = {
            metadata: {
                exportDate: new Date().toISOString(),
                totalRecords: {
                    users: users.length,
                    categories: categories.length,
                    channels: channels.length,
                    packages: packages.length,
                    subscribers: subscribers.length,
                    otts: otts.length,
                    credits: credits.length
                },
                adminUser: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            },
            data: {
                users,
                categories,
                channels,
                packages,
                subscribers,
                otts,
                credits
            }
        };

        // Generate filename with current date
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const filename = `iptv_backup_${dateStr}_${timeStr}.json`;

        // Set headers for JSON download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');

        // Send JSON response as download
        res.json(backupData);

    } catch (error) {
        console.error('❌ Backup export failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export database backup'
        });
    }
});

export default router;
