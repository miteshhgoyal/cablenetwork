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

        // Validate balance
        if (!balance) {
            return res.status(400).json({
                success: false,
                message: 'Balance amount is required'
            });
        }
        const initialBalance = parseFloat(balance);
        if (isNaN(initialBalance) || initialBalance < 1000) {
            return res.status(400).json({
                success: false,
                message: 'Minimum balance must be ₹1,000 or more'
            });
        }

        // Create reseller
        const reseller = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            phone: phone.trim(),
            role: 'reseller',
            subscriberLimit: subscriberLimit || 0,
            partnerCode: partnerCode?.trim() || '',
            packages: packages || [],
            status: status || 'Active',
            createdBy: userId,
            balance: initialBalance,
            validityDate: validityDate || null  // ✅ Validity support
        });

        await reseller.save();

        // Populate response
        await reseller.populate('packages', 'name cost duration');
        await reseller.populate('createdBy', 'name email status');

        res.status(201).json({
            success: true,
            message: 'Reseller created successfully',
            data: { reseller: reseller.toJSON() }
        });

    } catch (error) {
        console.error('Create reseller error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create reseller'
        });
    }
});

// Update reseller (FULL CASCADE)
router.put('/:id', authenticateToken, async (req, res) => {
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

        // Permission check
        if (currentUser.role === 'distributor' &&
            reseller.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this reseller'
            });
        }

        if (currentUser.role === 'distributor' && currentUser.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive. Cannot update resellers.'
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
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone are required'
            });
        }

        // Email uniqueness
        if (email.toLowerCase() !== reseller.email) {
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

        // Balance validation
        if (balance !== undefined && balance !== null && balance !== '') {
            const numBalance = parseFloat(balance);
            if (isNaN(numBalance) || numBalance < 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Balance amount cannot be less than ₹1,000'
                });
            }
            reseller.balance = numBalance;
        }

        // ✅ ValidityDate validation
        if (validityDate !== undefined && validityDate !== null && validityDate !== '') {
            const validity = new Date(validityDate);
            if (isNaN(validity.getTime()) || validity <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validity date must be a future date'
                });
            }
            reseller.validityDate = validity;
        }

        // Update basic fields
        reseller.name = name.trim();
        reseller.email = email.toLowerCase().trim();
        reseller.phone = phone.trim();
        reseller.subscriberLimit = subscriberLimit || 0;
        reseller.partnerCode = partnerCode?.trim() || '';
        reseller.packages = packages || [];

        // ✅ PERFECT STATUS CASCADE TO CUSTOMERS
        if (status && ['Active', 'Inactive'].includes(status)) {
            const oldStatus = reseller.status;
            reseller.status = status;

            // 🎯 MANUAL CASCADE: Inactivate ALL CUSTOMERS when setting Inactive
            if (status === 'Inactive' && oldStatus === 'Active') {
                console.log(`🎯 MANUAL CASCADE: Inactivating customers for reseller ${reseller.name}`);
                const customersUpdated = await Subscriber.updateMany(
                    { resellerId: reseller._id },
                    {
                        status: 'Inactive'  // ✅ Customer app login sees this!
                    }
                );
                console.log(`📉 Inactivated ${customersUpdated.modifiedCount} customers for reseller ${reseller.name}`);
            }
        }

        // Password update
        if (password && password.length >= 6) {
            reseller.password = password;
        } else if (password && password.length > 0 && password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        await reseller.save();

        // Auto-validity check (handles validityDate expiry)
        await reseller.checkValidityStatus();

        // Populate response
        await reseller.populate('packages', 'name cost duration');
        await reseller.populate('createdBy', 'name email status');

        res.json({
            success: true,
            message: 'Reseller updated successfully',
            data: { reseller: reseller.toJSON() }
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

        // Permission check
        if (currentUser.role === 'distributor' &&
            reseller.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this reseller'
            });
        }

        if (currentUser.role === 'distributor' && currentUser.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive. Cannot delete resellers.'
            });
        }

        // ✅ CASCADE: Inactivate customers before deletion
        console.log(`🎯 CASCADE: Inactivating customers before deleting reseller ${reseller.name}`);
        await Subscriber.updateMany(
            { resellerId: reseller._id },
            { status: 'Inactive' }
        );

        await reseller.deleteOne();

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
