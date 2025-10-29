// backend/src/routes/profile.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get current user profile
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('packages', 'name cost duration')
            .populate('createdBy', 'name email')
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Update profile
router.put('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, currentPassword, newPassword } = req.body;

        // Validation
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name and phone are required'
            });
        }

        const user = await User.findById(userId).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If changing password, verify current password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required to change password'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters'
                });
            }

            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Check if new password is different
            const isSamePassword = await user.comparePassword(newPassword);
            if (isSamePassword) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be different from current password'
                });
            }

            user.password = newPassword;
        }

        // Update basic fields
        user.name = name.trim();
        user.phone = phone.trim();

        await user.save();

        // Populate and return updated user
        await user.populate('packages', 'name cost duration');
        await user.populate('createdBy', 'name email');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: user.toJSON() }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

export default router;
