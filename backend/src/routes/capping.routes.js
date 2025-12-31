import express from 'express';
import { authenticateToken, authorize } from '../middlewares/auth.js';
import Capping from '../models/Capping.js';

const router = express.Router();

// Get current capping settings
router.get('/', authenticateToken, async (req, res) => {
    try {
        const settings = await Capping.getSettings();

        res.json({
            success: true,
            data: {
                distributorCapping: settings.distributorCapping,
                resellerCapping: settings.resellerCapping
            }
        });
    } catch (error) {
        console.error('Get capping settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch capping settings'
        });
    }
});

// Update capping settings (Admin only)
router.put('/', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { distributorCapping, resellerCapping } = req.body;

        // Validation
        if (distributorCapping === undefined || resellerCapping === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Both distributorCapping and resellerCapping are required'
            });
        }

        const distCap = Number(distributorCapping);
        const resellerCap = Number(resellerCapping);

        if (isNaN(distCap) || distCap < 0) {
            return res.status(400).json({
                success: false,
                message: 'Distributor capping must be a non-negative number'
            });
        }

        if (isNaN(resellerCap) || resellerCap < 0) {
            return res.status(400).json({
                success: false,
                message: 'Reseller capping must be a non-negative number'
            });
        }

        const settings = await Capping.updateSettings(distCap, resellerCap);

        res.json({
            success: true,
            message: 'Capping settings updated successfully',
            data: {
                distributorCapping: settings.distributorCapping,
                resellerCapping: settings.resellerCapping
            }
        });
    } catch (error) {
        console.error('Update capping settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update capping settings'
        });
    }
});

export default router;