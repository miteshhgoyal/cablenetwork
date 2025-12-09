import express from 'express';
import { authenticateToken, authorize } from '../middlewares/auth.js';
import User from '../models/User.js';
import Package from '../models/Package.js';

const router = express.Router();

// Get all resellers (role-based filtering with status check)
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
        // Admin sees all resellers (no additional filter)

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

// Get packages for dropdown - FILTERED BY USER ACCESS
router.get('/packages', authenticateToken, async (req, res) => {
    try {
        const { role, id: userId } = req.user;

        let packages;

        // For distributors and resellers, only show packages assigned to them
        if (role === 'distributor' || role === 'reseller') {
            const user = await User.findById(userId).select('packages');

            if (!user || !user.packages || user.packages.length === 0) {
                return res.json({
                    success: true,
                    data: { packages: [] }
                });
            }

            // Only fetch packages that the user has access to
            packages = await Package.find({ _id: { $in: user.packages } })
                .select('name cost duration')
                .sort({ name: 1 });
        } else {
            // Admin sees all packages
            packages = await Package.find()
                .select('name cost duration')
                .sort({ name: 1 });
        }

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

        // Check if distributor is Active (if current user is distributor)
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
            balance
        } = req.body;

        // Validation
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

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Validate balance - Minimum ₹1,000
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

        // VALIDATE PACKAGES - Ensure user can only assign packages they have access to
        if (packages && packages.length > 0) {
            if (currentUser.role === 'distributor') {
                // Check if all selected packages are in distributor's allowed packages
                const invalidPackages = packages.filter(
                    pkgId => !currentUser.packages.some(allowedPkg => allowedPkg.toString() === pkgId)
                );

                if (invalidPackages.length > 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only assign packages that are assigned to you'
                    });
                }
            }
            // Admin can assign any packages (no restriction)
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
            balance: initialBalance
        });

        await reseller.save();

        // Populate before sending
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

// Update reseller (with distributor status check)
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

        // Check access permissions
        if (currentUser.role === 'distributor' &&
            reseller.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this reseller'
            });
        }

        // Check if distributor is Active (if current user is distributor)
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
            balance
        } = req.body;

        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone are required'
            });
        }

        // Check if email already exists (excluding current reseller)
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

        // Validate balance if provided (optional in edit mode)
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

        // VALIDATE PACKAGES - Ensure user can only assign packages they have access to
        if (packages && packages.length > 0) {
            if (currentUser.role === 'distributor') {
                // Check if all selected packages are in distributor's allowed packages
                const invalidPackages = packages.filter(
                    pkgId => !currentUser.packages.some(allowedPkg => allowedPkg.toString() === pkgId)
                );

                if (invalidPackages.length > 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only assign packages that are assigned to you'
                    });
                }
            }
            // Admin can assign any packages (no restriction)
        }

        // Update fields
        reseller.name = name.trim();
        reseller.email = email.toLowerCase().trim();
        reseller.phone = phone.trim();
        reseller.subscriberLimit = subscriberLimit || 0;
        reseller.partnerCode = partnerCode?.trim() || '';
        reseller.packages = packages || [];

        // Validate status
        if (status && ['Active', 'Inactive'].includes(status)) {
            reseller.status = status;
        }

        // Update password if provided
        if (password && password.length >= 6) {
            reseller.password = password;
        } else if (password && password.length > 0 && password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        await reseller.save();

        // Populate before sending
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

        // Check access permissions
        if (currentUser.role === 'distributor' &&
            reseller.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this reseller'
            });
        }

        // Check if distributor is Active (if current user is distributor)
        if (currentUser.role === 'distributor' && currentUser.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive. Cannot delete resellers.'
            });
        }

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
