// backend/src/routes/packages.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Package from '../models/Package.js';
import Category from '../models/Category.js';
import Channel from '../models/Channel.js';
import User from '../models/User.js';

const router = express.Router();

// Get all packages
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;
        const { id: userId, role } = req.user;

        let query = {};

        // For distributors and resellers, only show packages assigned to them
        if (role === 'distributor' || role === 'reseller') {
            const user = await User.findById(userId).select('packages');
            if (!user || !user.packages || user.packages.length === 0) {
                return res.json({
                    success: true,
                    data: { packages: [] }
                });
            }
            query._id = { $in: user.packages };
        }

        // Add search filter
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const packages = await Package.find(query)
            .populate('genres', 'name')
            .populate('channels', 'name lcn')
            .sort({ createdAt: -1 });

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

// Get genres and channels for dropdowns - Filter by assigned packages
router.get('/options', authenticateToken, async (req, res) => {
    try {
        const { role, id: userId } = req.user;

        // For distributors and resellers, only show options from their assigned packages
        if (role === 'distributor' || role === 'reseller') {
            const user = await User.findById(userId).populate({
                path: 'packages',
                populate: [
                    { path: 'genres', select: 'name' },
                    { path: 'channels', select: 'name lcn' }
                ]
            });

            if (!user || !user.packages) {
                return res.json({
                    success: true,
                    data: { genres: [], channels: [] }
                });
            }

            // Extract unique genres and channels from assigned packages
            const genresSet = new Set();
            const channelsSet = new Set();

            user.packages.forEach(pkg => {
                pkg.genres?.forEach(genre => genresSet.add(JSON.stringify(genre)));
                pkg.channels?.forEach(channel => channelsSet.add(JSON.stringify(channel)));
            });

            const genres = Array.from(genresSet).map(item => JSON.parse(item));
            const channels = Array.from(channelsSet).map(item => JSON.parse(item));

            return res.json({
                success: true,
                data: { genres, channels }
            });
        }

        // For admin, show all options
        const genres = await Category.find({ type: 'Genre' }).sort({ name: 1 });
        const channels = await Channel.find().sort({ lcn: 1 });

        res.json({
            success: true,
            data: { genres, channels }
        });

    } catch (error) {
        console.error('Get options error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch options'
        });
    }
});

// Get single package
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const packaze = await Package.findById(req.params.id)
            .populate('genres', 'name')
            .populate('channels', 'name lcn');

        if (!packaze) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        res.json({
            success: true,
            data: { packaze }
        });

    } catch (error) {
        console.error('Get package error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch package'
        });
    }
});

// Create package (admin/distributor only)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { role } = req.user;

        // Check permissions
        if (role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to create packages'
            });
        }

        const { name, cost, genres, channels, duration } = req.body;

        // Validation
        if (!name || !cost || !duration) {
            return res.status(400).json({
                success: false,
                message: 'Name, cost, and duration are required'
            });
        }

        // Validate cost is at least 50 rupees
        if (isNaN(cost) || cost < 50) {
            return res.status(400).json({
                success: false,
                message: 'Package cost must be at least ₹50'
            });
        }

        // Check if package name already exists
        const existingPackage = await Package.findOne({
            name: name.trim()
        });

        if (existingPackage) {
            return res.status(400).json({
                success: false,
                message: 'Package with this name already exists'
            });
        }

        const packaze = new Package({
            name: name.trim(),
            cost,
            genres: genres || [],
            channels: channels || [],
            duration
        });

        await packaze.save();

        // Populate before sending response
        await packaze.populate('genres', 'name');
        await packaze.populate('channels', 'name lcn');

        res.status(201).json({
            success: true,
            message: 'Package created successfully',
            data: { packaze }
        });

    } catch (error) {
        console.error('Create package error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create package'
        });
    }
});

// Update package (admin/distributor only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { role } = req.user;

        // Check permissions
        if (role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update packages'
            });
        }

        const { name, cost, genres, channels, duration } = req.body;

        // Validation
        if (!name || !cost || !duration) {
            return res.status(400).json({
                success: false,
                message: 'Name, cost, and duration are required'
            });
        }

        // Validate cost is at least 50 rupees
        if (isNaN(cost) || cost < 50) {
            return res.status(400).json({
                success: false,
                message: 'Package cost must be at least ₹50'
            });
        }

        const packaze = await Package.findById(req.params.id);

        if (!packaze) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        // Check if updated name already exists
        const existingPackage = await Package.findOne({
            name: name.trim(),
            _id: { $ne: req.params.id }
        });

        if (existingPackage) {
            return res.status(400).json({
                success: false,
                message: 'Package with this name already exists'
            });
        }

        packaze.name = name.trim();
        packaze.cost = cost;
        packaze.genres = genres || [];
        packaze.channels = channels || [];
        packaze.duration = duration;

        await packaze.save();

        // Populate before sending response
        await packaze.populate('genres', 'name');
        await packaze.populate('channels', 'name lcn');

        res.json({
            success: true,
            message: 'Package updated successfully',
            data: { packaze }
        });

    } catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update package'
        });
    }
});

// Delete package (admin/distributor only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { role } = req.user;

        // Check permissions
        if (role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete packages'
            });
        }

        const packaze = await Package.findById(req.params.id);

        if (!packaze) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        await packaze.deleteOne();

        res.json({
            success: true,
            message: 'Package deleted successfully'
        });

    } catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete package'
        });
    }
});

export default router;
