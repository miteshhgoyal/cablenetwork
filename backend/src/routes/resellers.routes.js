import express from 'express';
import { authenticateToken, authorize } from '../middlewares/auth.js';
import User from '../models/User.js';
import Package from '../models/Package.js';
import Subscriber from '../models/Subscriber.js';

const router = express.Router();

// Get all resellers (role-based filtering with validity check)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, status } = req.query;
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        // Only admin and distributor can access resellers
        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view resellers'
            });
        }

        let query = { role: 'reseller' };

        // Role-based filtering
        if (currentUser.role === 'distributor') {
            // Distributor sees only their resellers
            query.createdBy = userId;
        }

        // Add search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { partnerCode: { $regex: search, $options: 'i' } }
            ];
        }

        // Add status filter
        if (status) {
            query.status = status;
        }

        const resellers = await User.find(query)
            .populate('packages', 'name cost duration')
            .populate('createdBy', 'name email status')
            .select('-password')
            .sort({ createdAt: -1 });

        // ✅ Check validity for all resellers and cascade to customers
        for (let reseller of resellers) {
            await reseller.checkValidityStatus();
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

// Get single reseller
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        const reseller = await User.findOne({
            _id: req.params.id,
            role: 'reseller'
        })
            .populate('packages', 'name cost duration')
            .populate('createdBy', 'name email status')
            .select('-password');

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Reseller not found'
            });
        }

        // ✅ Check validity status + cascade to customers
        await reseller.checkValidityStatus();

        // Check access permissions
        if (currentUser.role === 'distributor' &&
            reseller.createdBy._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this reseller'
            });
        }

        res.json({
            success: true,
            data: { reseller }
        });

    } catch (error) {
        console.error('Get reseller error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reseller'
        });
    }
});

// Create reseller
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        // Only admin and distributor can create resellers
        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to create resellers'
            });
        }

        // Check if distributor is Active
        if (currentUser.role === 'distributor' && currentUser.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive. Cannot create resellers.'
            });
        }

        const {
            name,
            email,
            password,
            phone,
            subscriberLimit,
            partnerCode,
            packages,
            status,
            balance,
            validityDate
        } = req.body;

        // Validation - Required fields
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and phone are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // ✅ Validate validityDate
        if (validityDate) {
            const validity = new Date(validityDate);
            if (isNaN(validity.getTime()) || validity <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validity date must be a future date'
                });
            }
        }

        // Check email uniqueness
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Validate packages if provided
        if (packages && packages.length > 0) {
            const validPackages = await Package.find({ _id: { $in: packages } });
            if (validPackages.length !== packages.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more invalid packages'
                });
            }
        }

        // Create reseller
        const reseller = new User({
            name,
            email: email.toLowerCase(),
            password,
            phone,
            role: 'reseller',
            subscriberLimit: subscriberLimit || 0,
            partnerCode: partnerCode || '',
            packages: packages || [],
            status: status || 'Active',
            balance: balance || 0,
            validityDate: validityDate || null,
            createdBy: userId
        });

        await reseller.save();

        // Populate fields before sending response
        await reseller.populate('packages', 'name cost duration');
        await reseller.populate('createdBy', 'name email status');

        // Remove password from response
        const resellerObj = reseller.toObject();
        delete resellerObj.password;

        res.status(201).json({
            success: true,
            message: 'Reseller created successfully',
            data: { reseller: resellerObj }
        });

    } catch (error) {
        console.error('Create reseller error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create reseller'
        });
    }
});

// Update reseller
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        // Find reseller
        const reseller = await User.findOne({
            _id: req.params.id,
            role: 'reseller'
        });

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Reseller not found'
            });
        }

        // Check access permissions
        if (currentUser.role === 'distributor' &&
            reseller.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this reseller'
            });
        }

        const {
            name,
            email,
            password,
            phone,
            subscriberLimit,
            partnerCode,
            packages,
            status,
            balance,
            validityDate
        } = req.body;

        // Validation
        if (email && email !== reseller.email) {
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
            reseller.email = email.toLowerCase();
        }

        // ✅ Validate validityDate if provided
        if (validityDate !== undefined) {
            if (validityDate === null || validityDate === '') {
                reseller.validityDate = null;
            } else {
                const validity = new Date(validityDate);
                if (isNaN(validity.getTime()) || validity <= new Date()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Validity date must be a future date'
                    });
                }
                reseller.validityDate = validity;
            }
        }

        // Validate packages if provided
        if (packages) {
            const validPackages = await Package.find({ _id: { $in: packages } });
            if (validPackages.length !== packages.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more invalid packages'
                });
            }
            reseller.packages = packages;
        }

        // Update fields
        if (name) reseller.name = name;
        if (password) reseller.password = password;
        if (phone) reseller.phone = phone;
        if (subscriberLimit !== undefined) reseller.subscriberLimit = subscriberLimit;
        if (partnerCode !== undefined) reseller.partnerCode = partnerCode;
        if (status) reseller.status = status;
        if (balance !== undefined) reseller.balance = balance;

        // Save reseller
        await reseller.save();

        // Check validity after update (this will cascade to customers if needed)
        await reseller.checkValidityStatus();

        // Populate and return
        await reseller.populate('packages', 'name cost duration');
        await reseller.populate('createdBy', 'name email status');

        const resellerObj = reseller.toObject();
        delete resellerObj.password;

        res.json({
            success: true,
            message: 'Reseller updated successfully',
            data: { reseller: resellerObj }
        });

    } catch (error) {
        console.error('Update reseller error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update reseller'
        });
    }
});

// Delete reseller
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        const reseller = await User.findOne({
            _id: req.params.id,
            role: 'reseller'
        });

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Reseller not found'
            });
        }

        // Check access permissions
        if (currentUser.role === 'distributor' &&
            reseller.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this reseller'
            });
        }

        // Check if reseller has active subscribers
        const subscriberCount = await Subscriber.countDocuments({
            createdBy: req.params.id
        });

        if (subscriberCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete reseller with ${subscriberCount} active subscribers`
            });
        }

        await User.deleteOne({ _id: req.params.id });

        res.json({
            success: true,
            message: 'Reseller deleted successfully'
        });

    } catch (error) {
        console.error('Delete reseller error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete reseller'
        });
    }
});

export default router;