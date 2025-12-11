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

        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view credit transactions'
            });
        }

        let userIds = [];

        if (currentUser.role === 'admin') {
            const allUsers = await User.find().select('_id');
            userIds = allUsers.map(u => u._id);
        } else if (currentUser.role === 'distributor') {
            const resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            }).select('_id');
            userIds = resellers.map(r => r._id);
        }

        let query = { user: { $in: userIds } };
        if (type) {
            query.type = type;
        }

        const credits = await Credit.find(query)
            .populate('user', 'name email role balance')
            .sort({ createdAt: -1 });

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

        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view users'
            });
        }

        let users = [];

        if (currentUser.role === 'admin') {
            // ADMIN: Can see distributors AND resellers
            users = await User.find({ role: { $in: ['distributor', 'reseller'] } })
                .select('name email role balance createdBy')
                .sort({ name: 1 });
        } else if (currentUser.role === 'distributor') {
            // DISTRIBUTOR: Can see ONLY their resellers
            users = await User.find({
                role: 'reseller',
                createdBy: userId
            })
                .select('name email role balance createdBy')
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

// Create credit transaction with role-based permissions
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        // RESSELLER: Cannot create ANY transactions
        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'Resellers cannot create credit transactions'
            });
        }

        const { type, amount, user: targetUserId } = req.body;

        // Validation
        if (!type || !amount || !targetUserId) {
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

        const amountNum = parseFloat(amount);
        if (amountNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Target user not found'
            });
        }

        // Role-based permission checks
        const canPerformAction = checkTransferPermission(currentUser, targetUser);
        if (!canPerformAction) {
            return res.status(403).json({
                success: false,
                message: getPermissionErrorMessage(currentUser.role, targetUser.role)
            });
        }

        // Balance validation & transfer
        if (type === 'Debit') {
            // DEBIT: Current user → Target user
            if (currentUser.balance < amountNum) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Your balance: ₹${currentUser.balance.toLocaleString('en-IN')}`
                });
            }
            currentUser.balance -= amountNum;
            targetUser.balance += amountNum;
        } else {
            // REVERSE CREDIT: Target user → Current user
            if (targetUser.balance < amountNum) {
                return res.status(400).json({
                    success: false,
                    message: `Target user insufficient balance. Their balance: ₹${targetUser.balance.toLocaleString('en-IN')}`
                });
            }
            targetUser.balance -= amountNum;
            currentUser.balance += amountNum;
        }

        // Save both users atomically
        await Promise.all([currentUser.save(), targetUser.save()]);

        // Create audit record for TARGET user
        const credit = new Credit({
            type,
            amount: amountNum,
            user: targetUserId
        });
        await credit.save();
        await credit.populate('user', 'name email role balance');

        console.log(`💰 ${type} ₹${amountNum}: ${currentUser.role}(${currentUser.name}) ${type === 'Debit' ? '→' : '←'} ${targetUser.role}(${targetUser.name})`);

        res.status(201).json({
            success: true,
            message: `${type} transaction completed successfully`,
            data: {
                credit,
                senderBalance: currentUser.balance,
                targetBalance: targetUser.balance,
                senderName: currentUser.name,
                targetName: targetUser.name
            }
        });

    } catch (error) {
        console.error('Create credit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create credit transaction'
        });
    }
});

// Permission validation functions
function checkTransferPermission(sender, target) {
    const senderRole = sender.role;
    const targetRole = target.role;

    // ADMIN can transfer to/from DISTRIBUTOR or RESELLER
    if (senderRole === 'admin') {
        return targetRole === 'distributor' || targetRole === 'reseller';
    }

    // DISTRIBUTOR can ONLY transfer to/from THEIR OWN RESELLERS
    if (senderRole === 'distributor') {
        return targetRole === 'reseller' && target.createdBy?.toString() === sender._id.toString();
    }

    // RESSELLER cannot transfer to anyone
    return false;
}

function getPermissionErrorMessage(senderRole, targetRole) {
    if (senderRole === 'reseller') {
        return 'Resellers cannot create credit transactions';
    }

    if (senderRole === 'distributor') {
        return `Distributors can only manage their own resellers (not ${targetRole}s)`;
    }

    return `Cannot perform this action with ${targetRole}`;
}

// Delete credit transaction (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

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

        const targetUser = credit.user;
        if (credit.type === 'Debit') {
            targetUser.balance -= credit.amount;
        } else if (credit.type === 'Reverse Credit') {
            targetUser.balance += credit.amount;
        }

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
