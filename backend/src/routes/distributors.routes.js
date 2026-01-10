import express from 'express';
import { authenticateToken, authorize } from '../middlewares/auth.js';
import User from '../models/User.js';
import Package from '../models/Package.js';
import Subscriber from '../models/Subscriber.js';

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

        // ✅ Check validity for all distributors + cascade to customers
        for (let distributor of distributors) {
            await distributor.checkValidityStatus();
        }

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

        // ✅ Check validity status + cascade to customers
        await distributor.checkValidityStatus();

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

        const { name, email, password, phone, status, balance, packages, validityDate } = req.body;

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

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // ✅ BALANCE MANAGEMENT - Deduct from admin (tracking purposes)
        // Admin typically has unlimited balance, but we track the allocation
        if (initialBalance > 0) {
            // Check if admin has sufficient balance (only if admin balance is being tracked)
            if (currentUser.balance !== undefined && currentUser.balance < initialBalance) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. You need ₹${initialBalance} but have ₹${currentUser.balance}`,
                    data: {
                        currentBalance: currentUser.balance,
                        requiredAmount: initialBalance
                    }
                });
            }

            // Deduct from admin balance (if tracked)
            if (currentUser.balance !== undefined) {
                currentUser.balance -= initialBalance;
                await currentUser.save();
            }
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
            packages: packages || [],
            validityDate: validityDate || null
        });

        await distributor.save();

        // Populate before sending
        await distributor.populate('packages', 'name cost duration');

        res.status(201).json({
            success: true,
            message: `Distributor created successfully${initialBalance > 0 ? `. ₹${initialBalance} allocated.` : ''}`,
            data: {
                distributor: distributor.toJSON(),
                adminNewBalance: currentUser.balance
            }
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

// Update distributor (FULL CASCADE)
router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const { name, email, password, phone, status, balance, packages, validityDate } = req.body;

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

        // ✅ BALANCE MANAGEMENT - Handle balance changes
        if (balance !== undefined && balance !== null && balance !== '') {
            const oldBalance = distributor.balance;
            const numBalance = parseFloat(balance);

            if (isNaN(numBalance) || numBalance < 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'Balance amount cannot be less than ₹10,000'
                });
            }

            const balanceDifference = numBalance - oldBalance;

            if (balanceDifference > 0) {
                // Balance is being increased - deduct from admin
                if (currentUser.balance !== undefined) {
                    if (currentUser.balance < balanceDifference) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient balance. You need ₹${balanceDifference} more but have ₹${currentUser.balance}`,
                            data: {
                                currentBalance: currentUser.balance,
                                requiredAmount: balanceDifference,
                                oldDistributorBalance: oldBalance,
                                newDistributorBalance: numBalance
                            }
                        });
                    }

                    // Deduct from admin
                    currentUser.balance -= balanceDifference;
                    await currentUser.save();
                }

            } else if (balanceDifference < 0) {
                // Balance is being decreased - return to admin (if tracked)
                if (currentUser.balance !== undefined) {
                    currentUser.balance += Math.abs(balanceDifference);
                    await currentUser.save();
                }
            }

            distributor.balance = numBalance;
        }

        // ✅ Validate validityDate
        if (validityDate !== undefined && validityDate !== null && validityDate !== '') {
            const validity = new Date(validityDate);
            if (isNaN(validity.getTime()) || validity <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validity date must be a future date'
                });
            }
            distributor.validityDate = validity;
        }

        // Update basic fields
        distributor.name = name.trim();
        distributor.email = email.toLowerCase().trim();
        distributor.phone = phone.trim();
        distributor.packages = packages || [];

        // ✅ PERFECT STATUS CASCADE - Distributor → Resellers → ALL CUSTOMERS
        if (status && ['Active', 'Inactive'].includes(status)) {
            const oldStatus = distributor.status;
            distributor.status = status;

            // 🎯 MANUAL CASCADE: Inactivate ALL RESELLERS + CUSTOMERS
            if (status === 'Inactive' && oldStatus === 'Active') {
                console.log(`🎯 MANUAL CASCADE: Inactivating resellers + customers for distributor ${distributor.name}`);

                // 1️⃣ Inactivate ALL resellers
                const resellersUpdated = await User.updateMany(
                    { createdBy: distributor._id, role: 'reseller' },
                    { status: 'Inactive' }
                );
                console.log(`📉 Inactivated ${resellersUpdated.modifiedCount} resellers`);

                // 2️⃣ Get all affected reseller IDs
                const resellerDocs = await User.find({ createdBy: distributor._id, role: 'reseller' });
                const resellerIds = resellerDocs.map(r => r._id);

                // 3️⃣ Inactivate ALL CUSTOMERS under those resellers
                if (resellerIds.length > 0) {
                    const customersUpdated = await Subscriber.updateMany(
                        { resellerId: { $in: resellerIds } },
                        { status: 'Inactive' }
                    );
                    console.log(`📉 Inactivated ${customersUpdated.modifiedCount} customers`);
                }
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

        // Auto-validity check (handles validityDate expiry)
        await distributor.checkValidityStatus();

        // Populate before sending
        await distributor.populate('packages', 'name cost duration');

        res.json({
            success: true,
            message: 'Distributor updated successfully',
            data: {
                distributor: distributor.toJSON(),
                adminNewBalance: currentUser.balance
            }
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

        // ✅ CASCADE: Inactivate ALL CUSTOMERS before deletion (safety)
        console.log(`🎯 CASCADE: Inactivating customers before deleting distributor ${distributor.name}`);
        const allResellers = await User.find({ createdBy: distributor._id, role: 'reseller' });
        const allResellerIds = allResellers.map(r => r._id);

        if (allResellerIds.length > 0) {
            await Subscriber.updateMany(
                { resellerId: { $in: allResellerIds } },
                { status: 'Inactive' }
            );
        }

        // ✅ BALANCE MANAGEMENT - Return distributor's balance to admin (if tracked)
        if (distributor.balance > 0 && currentUser.balance !== undefined) {
            currentUser.balance += distributor.balance;
            await currentUser.save();
        }

        await distributor.deleteOne();

        res.json({
            success: true,
            message: `Distributor deleted successfully${distributor.balance > 0 ? `. ₹${distributor.balance} returned to admin balance.` : ''}`,
            data: {
                adminNewBalance: currentUser.balance
            }
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
