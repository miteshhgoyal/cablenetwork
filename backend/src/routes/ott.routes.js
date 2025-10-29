// backend/src/routes/ott.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Ott from '../models/Ott.js';
import Category from '../models/Category.js';

const router = express.Router();

// Get all OTT content
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, type } = req.query;

        let query = {};

        // Add search filter
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        // Add type filter
        if (type) {
            query.type = type;
        }

        const ottContent = await Ott.find(query)
            .populate('genre', 'name')
            .populate('language', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { ottContent }
        });

    } catch (error) {
        console.error('Get OTT content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch OTT content'
        });
    }
});

// Get languages and genres for dropdowns
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const languages = await Category.find({ type: 'Language' }).sort({ name: 1 });
        const genres = await Category.find({ type: 'Genre' }).sort({ name: 1 });

        res.json({
            success: true,
            data: { languages, genres }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

// Get single OTT content
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const ott = await Ott.findById(req.params.id)
            .populate('genre', 'name')
            .populate('language', 'name');

        if (!ott) {
            return res.status(404).json({
                success: false,
                message: 'OTT content not found'
            });
        }

        res.json({
            success: true,
            data: { ott }
        });

    } catch (error) {
        console.error('Get OTT content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch OTT content'
        });
    }
});

// Create OTT content
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            type,
            title,
            genre,
            language,
            mediaUrl,
            horizontalUrl,
            verticalUrl,
            seasonsCount
        } = req.body;

        // Validation
        if (!type || !title || !genre || !language || !mediaUrl || !horizontalUrl || !verticalUrl) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Validate type
        if (!['Movie', 'Web Series'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either Movie or Web Series'
            });
        }

        // Validate seasons count for Web Series
        if (type === 'Web Series' && (!seasonsCount || seasonsCount < 1)) {
            return res.status(400).json({
                success: false,
                message: 'Seasons count is required for Web Series'
            });
        }

        const ott = new Ott({
            type,
            title: title.trim(),
            genre,
            language,
            mediaUrl: mediaUrl.trim(),
            horizontalUrl: horizontalUrl.trim(),
            verticalUrl: verticalUrl.trim(),
            seasonsCount: type === 'Web Series' ? seasonsCount : 0
        });

        await ott.save();

        // Populate before sending response
        await ott.populate('genre', 'name');
        await ott.populate('language', 'name');

        res.status(201).json({
            success: true,
            message: 'OTT content created successfully',
            data: { ott }
        });

    } catch (error) {
        console.error('Create OTT content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create OTT content'
        });
    }
});

// Update OTT content
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const {
            type,
            title,
            genre,
            language,
            mediaUrl,
            horizontalUrl,
            verticalUrl,
            seasonsCount
        } = req.body;

        // Validation
        if (!type || !title || !genre || !language || !mediaUrl || !horizontalUrl || !verticalUrl) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const ott = await Ott.findById(req.params.id);

        if (!ott) {
            return res.status(404).json({
                success: false,
                message: 'OTT content not found'
            });
        }

        // Validate type
        if (!['Movie', 'Web Series'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either Movie or Web Series'
            });
        }

        // Validate seasons count for Web Series
        if (type === 'Web Series' && (!seasonsCount || seasonsCount < 1)) {
            return res.status(400).json({
                success: false,
                message: 'Seasons count is required for Web Series'
            });
        }

        ott.type = type;
        ott.title = title.trim();
        ott.genre = genre;
        ott.language = language;
        ott.mediaUrl = mediaUrl.trim();
        ott.horizontalUrl = horizontalUrl.trim();
        ott.verticalUrl = verticalUrl.trim();
        ott.seasonsCount = type === 'Web Series' ? seasonsCount : 0;

        await ott.save();

        // Populate before sending response
        await ott.populate('genre', 'name');
        await ott.populate('language', 'name');

        res.json({
            success: true,
            message: 'OTT content updated successfully',
            data: { ott }
        });

    } catch (error) {
        console.error('Update OTT content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update OTT content'
        });
    }
});

// Delete OTT content
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const ott = await Ott.findById(req.params.id);

        if (!ott) {
            return res.status(404).json({
                success: false,
                message: 'OTT content not found'
            });
        }

        await ott.deleteOne();

        res.json({
            success: true,
            message: 'OTT content deleted successfully'
        });

    } catch (error) {
        console.error('Delete OTT content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete OTT content'
        });
    }
});

export default router;
