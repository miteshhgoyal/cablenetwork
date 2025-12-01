// backend/src/routes/distributors.js
import express from 'express';
import { authenticateToken, authorize } from '../middlewares/auth.js';
import User from '../models/User.js';
import Package from '../models/Package.js';

const router = express.Router();

// Get all distributors (admin only)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        // Only admin can access distributors
        if (currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view distributors'
            });
        }

        const { search, status } = req.query;
        let query = { role: 'distributor' };

        // Add search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Add status filter
        if (status) {
            query.status = status;
        }

        const distributors = await User.find(query)
            .populate('packages', 'name cost duration')
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { distributors }
        });

    } catch (error) {
        console.error('Get distributors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distributors'
        });
    }
});

// Get packages for dropdown
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

// Get single distributor
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        if (currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view distributors'
            });
        }

        const distributor = await User.findOne({
            _id: req.params.id,
            role: 'distributor'
        })
            .populate('packages', 'name cost duration')
            .select('-password');

        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        // Get resellers count for this distributor
        const resellersCount = await User.countDocuments({
            role: 'reseller',
            createdBy: req.params.id
        });

        res.json({
            success: true,
            data: {
                distributor,
                resellersCount
            }
        });

    } catch (error) {
        console.error('Get distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distributor'
        });
    }
});

// Create distributor
router.post('/', authenticateToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        // Only admin can create distributors
        if (currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to create distributors'
            });
        }

        const { name, email, password, phone, status, balance, packages } = req.body;

        // Validation - Required fields
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and phone are required'
            });
        }

        // Validation - Password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Validation - Minimum balance
        const initialBalance = balance ? parseFloat(balance) : 0;
        if (isNaN(initialBalance) || initialBalance < 10000) {
            return res.status(400).json({
                success: false,
                message: 'Minimum balance must be ₹10,000 or more'
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Create distributor
        const distributor = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            phone: phone.trim(),
            role: 'distributor',
            status: status || 'Active',
            balance: initialBalance,
            packages: packages || []
        });

        await distributor.save();

        // Populate before sending
        await distributor.populate('packages', 'name cost duration');

        res.status(201).json({
            success: true,
            message: 'Distributor created successfully',
            data: { distributor: distributor.toJSON() }
        });

    } catch (error) {
        console.error('Create distributor error:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create distributor'
        });
    }
});

// Update distributor
router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { name, email, password, phone, status, balance, packages } = req.body;

        // Validation - Required fields
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone are required'
            });
        }

        const distributor = await User.findOne({
            _id: req.params.id,
            role: 'distributor'
        });

        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        // Check if email already exists (excluding current distributor)
        if (email.toLowerCase() !== distributor.email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.params.id }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Validate balance if provided
        if (balance !== undefined && balance !== null && balance !== '') {
            const numBalance = parseFloat(balance);
            if (isNaN(numBalance) || numBalance < 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'Balance amount cannot be less than ₹10,000'
                });
            }
            distributor.balance = numBalance;
        }

        // Update fields
        distributor.name = name.trim();
        distributor.email = email.toLowerCase().trim();
        distributor.phone = phone.trim();
        distributor.packages = packages || [];

        // Validate and update status
        if (status && ['Active', 'Inactive'].includes(status)) {
            distributor.status = status;

            // If changing to Inactive, cascade to all resellers
            if (status === 'Inactive') {
                await User.updateMany(
                    { createdBy: req.params.id, role: 'reseller' },
                    { status: 'Inactive' }
                );
            }
        }

        // Update password if provided
        if (password && password.length >= 6) {
            distributor.password = password;
        } else if (password && password.length > 0 && password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        await distributor.save();

        // Populate before sending
        await distributor.populate('packages', 'name cost duration');

        res.json({
            success: true,
            message: 'Distributor updated successfully',
            data: { distributor: distributor.toJSON() }
        });

    } catch (error) {
        console.error('Update distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update distributor'
        });
    }
});

// Delete distributor
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        if (currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete distributors'
            });
        }

        const distributor = await User.findOne({
            _id: req.params.id,
            role: 'distributor'
        });

        if (!distributor) {
            return res.status(404).json({
                success: false,
                message: 'Distributor not found'
            });
        }

        // Check if distributor has resellers
        const resellersCount = await User.countDocuments({
            role: 'reseller',
            createdBy: req.params.id
        });

        if (resellersCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete distributor with ${resellersCount} active reseller(s)`
            });
        }

        await distributor.deleteOne();

        res.json({
            success: true,
            message: 'Distributor deleted successfully'
        });

    } catch (error) {
        console.error('Delete distributor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete distributor'
        });
    }
});

export default router;
