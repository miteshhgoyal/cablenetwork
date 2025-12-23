// backend/src/routes/credit.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Credit from '../models/Credit.js';
import User from '../models/User.js';

const router = express.Router();

// Get all credit transactions (role-based filtering)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, type } = req.query;
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        // Resellers cannot access this page
        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view credit transactions'
            });
        }

        let userIds = [];

        // Role-based filtering
        if (currentUser.role === 'admin') {
            // Admin sees all transactions
            const allUsers = await User.find().select('_id');
            userIds = allUsers.map(u => u._id);
        } else if (currentUser.role === 'distributor') {
            // Distributor sees only their resellers' transactions
            const resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            }).select('_id');
            userIds = resellers.map(r => r._id);
        }

        let query = { user: { $in: userIds } };

        // Add type filter
        if (type) {
            query.type = type;
        }

        const credits = await Credit.find(query)
            .populate('user', 'name email role balance')
            .sort({ createdAt: -1 });

        // Apply search filter after population
        let filteredCredits = credits;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredCredits = credits.filter(credit =>
                credit.user?.name.toLowerCase().includes(searchLower) ||
                credit.user?.email.toLowerCase().includes(searchLower) ||
                credit.amount.toString().includes(searchLower)
            );
        }

        res.json({
            success: true,
            data: { credits: filteredCredits }
        });

    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch credit transactions'
        });
    }
});

// Get users for dropdown (role-based)
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        // Resellers cannot access this
        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view users'
            });
        }

        let users = [];

        if (currentUser.role === 'admin') {
            // Admin can see all users (distributors and resellers)
            users = await User.find({ role: { $in: ['admin','distributor', 'reseller'] } })
                .select('name email role balance')
                .sort({ name: 1 });
        } else if (currentUser.role === 'distributor') {
            // Distributor sees only their resellers
            users = await User.find({
                role: 'reseller',
                createdBy: userId
            })
                .select('name email role balance')
                .sort({ name: 1 });
        }

        res.json({
            success: true,
            data: { users }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Create credit transaction
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        // Resellers cannot create transactions
        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to create credit transactions'
            });
        }

        const { type, amount, user: targetUserId } = req.body;

        // Basic presence validation
        if (!type || amount == null || !targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Type, amount, and user are required'
            });
        }

        if (!['Debit', 'Reverse Credit'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either Debit or Reverse Credit'
            });
        }

        // Coerce amount to number and validate
        const amt = Number(amount);
        if (Number.isNaN(amt) || amt <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check access permissions for distributor
        if (currentUser.role === 'distributor') {
            if (targetUser.role !== 'reseller' ||
                targetUser.createdBy.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only manage credit for your resellers'
                });
            }
        }

        // Check balance for Reverse Credit
        if (type === 'Reverse Credit' && targetUser.balance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Current balance: ₹${targetUser.balance}`
            });
        }

        // Create credit transaction (store numeric amount)
        const credit = new Credit({
            type,
            amount: amt,
            user: targetUserId
        });

        await credit.save();

        // Ensure numeric balance and apply change
        const beforeBalance = Number(targetUser.balance || 0);
        console.log(`Updating balance for user ${targetUser._id}: before=${beforeBalance}, amt=${amt}, type=${type}`);
        if (type === 'Debit') {
            targetUser.balance = beforeBalance + amt;
        } else if (type === 'Reverse Credit') {
            // Prevent negative balance (secondary guard)
            targetUser.balance = beforeBalance - amt;
        }

        await targetUser.save();

        // Populate before sending
        await credit.populate('user', 'name email role balance');

        res.status(201).json({
            success: true,
            message: 'Credit transaction created successfully',
            data: { credit }
        });

    } catch (error) {
        console.error('Create credit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create credit transaction'
        });
    }
});

// Delete credit transaction (optional - for admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        // Only admin can delete
        if (currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete credit transactions'
            });
        }

        const credit = await Credit.findById(req.params.id).populate('user');

        if (!credit) {
            return res.status(404).json({
                success: false,
                message: 'Credit transaction not found'
            });
        }

        // Reverse the balance change (use numeric arithmetic)
        const targetUser = credit.user;
        const amt = Number(credit.amount) || 0;
        const before = Number(targetUser.balance || 0);
        console.log(`Reversing credit ${credit._id} for user ${targetUser._id}: before=${before}, amt=${amt}, type=${credit.type}`);

        if (credit.type === 'Debit') {
            targetUser.balance = before - amt;
        } else if (credit.type === 'Reverse Credit') {
            targetUser.balance = before + amt;
        }  

        // Persist changes and remove the credit record
        await targetUser.save();
        await credit.deleteOne();

        res.json({
            success: true,
            message: 'Credit transaction deleted and balance reversed'
        });

    } catch (error) {
        console.error('Delete credit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete credit transaction'
        });
    }
});

export default router;
