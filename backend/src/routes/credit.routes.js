import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Credit from '../models/Credit.js';
import User from '../models/User.js';
import Capping from '../models/Capping.js';

const router = express.Router();

// Helper function to get capping amounts
const getCappingAmounts = async () => {
    const settings = await Capping.getSettings();
    return {
        distributor: settings.distributorCapping,
        reseller: settings.resellerCapping,
        admin: 0
    };
};

// Get all credit transactions with proper user details
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { type } = req.query;
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        let query = {};

        // Role-based filtering: show transactions where user is sender or target
        if (currentUser.role === 'admin') {
            // Admin sees all transactions
        } else if (currentUser.role === 'distributor') {
            // Distributor sees transactions involving them or their resellers
            const resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            }).select('_id');
            const resellerIds = resellers.map(r => r._id);

            query.$or = [
                { senderUser: userId },
                { targetUser: userId },
                { senderUser: { $in: resellerIds } },
                { targetUser: { $in: resellerIds } }
            ];
        } else if (currentUser.role === 'reseller') {
            // Reseller sees only their transactions
            query.$or = [
                { senderUser: userId },
                { targetUser: userId }
            ];
        }

        if (type) {
            query.type = type;
        }

        const credits = await Credit.find(query)
            .populate('senderUser', 'name email role balance')
            .populate('targetUser', 'name email role balance')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { credits }
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

        let users = [];

        if (currentUser.role === 'admin') {
            users = await User.find({ role: { $in: ['admin', 'distributor', 'reseller'] } })
                .select('name email role balance')
                .sort({ name: 1 });
        } else if (currentUser.role === 'distributor') {
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

// Create credit transaction (Credit, Debit, Reverse Credit)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        if (currentUser.role === 'reseller') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to create credit transactions'
            });
        }

        const { type, amount, user: targetUserId } = req.body;

        if (!type || amount == null || !targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Type, amount, and user are required'
            });
        }

        if (!['Credit', 'Debit', 'Reverse Credit'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be Credit, Debit, or Reverse Credit'
            });
        }

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

        // ✅ Get dynamic capping amounts
        const CAPPING = await getCappingAmounts();

        const senderCapping = CAPPING[currentUser.role] || 0;
        const targetCapping = CAPPING[targetUser.role] || 0;

        let senderBalanceAfter = currentUser.balance;
        let targetBalanceAfter = targetUser.balance;

        // Calculate balances based on transaction type
        if (type === 'Credit') {
            // Sender gives money to target
            senderBalanceAfter = currentUser.balance - amt;
            targetBalanceAfter = targetUser.balance + amt;

            if (senderBalanceAfter < senderCapping) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot perform Credit. Your balance will go below capping limit of ₹${senderCapping.toLocaleString('en-IN')}`
                });
            }
        } else if (type === 'Debit' || type === 'Reverse Credit') {
            // Sender takes money from target
            senderBalanceAfter = currentUser.balance + amt;
            targetBalanceAfter = targetUser.balance - amt;

            if (targetUser.balance < amt) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. ${targetUser.name}'s current balance: ₹${targetUser.balance.toLocaleString('en-IN')}`
                });
            }

            if (targetBalanceAfter < targetCapping) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot perform ${type}. ${targetUser.name}'s balance will go below capping limit of ₹${targetCapping.toLocaleString('en-IN')}`
                });
            }
        }

        // Create credit transaction with both sender and target
        const credit = new Credit({
            type,
            amount: amt,
            senderUser: userId,
            targetUser: targetUserId,
            senderBalanceAfter,
            targetBalanceAfter
        });

        await credit.save();

        // Update balances
        currentUser.balance = senderBalanceAfter;
        targetUser.balance = targetBalanceAfter;

        await currentUser.save();
        await targetUser.save();

        await credit.populate('senderUser', 'name email role balance');
        await credit.populate('targetUser', 'name email role balance');

        res.status(201).json({
            success: true,
            message: 'Credit transaction created successfully',
            data: {
                credit,
                senderBalance: senderBalanceAfter,
                targetBalance: targetBalanceAfter,
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

// Admin self-credit endpoint
router.post('/self-credit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        if (currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can perform self-credit'
            });
        }

        const { amount } = req.body;

        if (amount == null) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }

        const amt = Number(amount);
        if (Number.isNaN(amt) || amt <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        const newBalance = currentUser.balance + amt;

        // Create self-credit transaction record
        const credit = new Credit({
            type: 'Self Credit',
            amount: amt,
            senderUser: userId,
            targetUser: null,
            senderBalanceAfter: newBalance,
            targetBalanceAfter: null
        });

        await credit.save();

        // Update admin balance
        currentUser.balance = newBalance;
        await currentUser.save();

        await credit.populate('senderUser', 'name email role balance');

        res.status(201).json({
            success: true,
            message: 'Self credit successful',
            data: {
                credit,
                newBalance
            }
        });

    } catch (error) {
        console.error('Self credit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform self credit'
        });
    }
});

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

        const credit = await Credit.findById(req.params.id)
            .populate('senderUser')
            .populate('targetUser');

        if (!credit) {
            return res.status(404).json({
                success: false,
                message: 'Credit transaction not found'
            });
        }

        // Reverse the balance changes
        const amt = Number(credit.amount) || 0;

        if (credit.type === 'Self Credit') {
            credit.senderUser.balance -= amt;
            await credit.senderUser.save();
        } else {
            if (credit.type === 'Credit') {
                credit.senderUser.balance += amt;
                credit.targetUser.balance -= amt;
            } else if (credit.type === 'Debit' || credit.type === 'Reverse Credit') {
                credit.senderUser.balance -= amt;
                credit.targetUser.balance += amt;
            }

            await credit.senderUser.save();
            await credit.targetUser.save();
        }

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
