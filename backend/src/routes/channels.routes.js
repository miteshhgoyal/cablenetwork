// backend/src/routes/channels.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Channel from '../models/Channel.js';
import Category from '../models/Category.js';

const router = express.Router();

// Get all channels (with optional search and populated categories)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;

        let query = {};

        // Add search filter
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const channels = await Channel.find(query)
            .populate('language', 'name')
            .populate('genre', 'name')
            .sort({ lcn: 1 }); // Sort by LCN number

        res.json({
            success: true,
            data: { channels }
        });

    } catch (error) {
        console.error('Get channels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch channels'
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

// Get single channel
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id)
            .populate('language', 'name')
            .populate('genre', 'name');

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        res.json({
            success: true,
            data: { channel }
        });

    } catch (error) {
        console.error('Get channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch channel'
        });
    }
});

// Create channel
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, lcn, language, genre, url, imageUrl } = req.body;

        // Validation
        if (!name || !lcn || !language || !genre || !url || !imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if LCN already exists
        const existingChannel = await Channel.findOne({ lcn });
        if (existingChannel) {
            return res.status(400).json({
                success: false,
                message: 'LCN number already exists'
            });
        }

        const channel = new Channel({
            name: name.trim(),
            lcn,
            language,
            genre,
            url: url.trim(),
            imageUrl: imageUrl.trim()
        });

        await channel.save();

        // Populate before sending response
        await channel.populate('language', 'name');
        await channel.populate('genre', 'name');

        res.status(201).json({
            success: true,
            message: 'Channel created successfully',
            data: { channel }
        });

    } catch (error) {
        console.error('Create channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create channel'
        });
    }
});

// Update channel
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, lcn, language, genre, url, imageUrl } = req.body;

        // Validation
        if (!name || !lcn || !language || !genre || !url || !imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        // Check if LCN already exists (excluding current channel)
        const existingChannel = await Channel.findOne({
            lcn,
            _id: { $ne: req.params.id }
        });

        if (existingChannel) {
            return res.status(400).json({
                success: false,
                message: 'LCN number already exists'
            });
        }

        channel.name = name.trim();
        channel.lcn = lcn;
        channel.language = language;
        channel.genre = genre;
        channel.url = url.trim();
        channel.imageUrl = imageUrl.trim();

        await channel.save();

        // Populate before sending response
        await channel.populate('language', 'name');
        await channel.populate('genre', 'name');

        res.json({
            success: true,
            message: 'Channel updated successfully',
            data: { channel }
        });

    } catch (error) {
        console.error('Update channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update channel'
        });
    }
});

// Delete channel
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        await channel.deleteOne();

        res.json({
            success: true,
            message: 'Channel deleted successfully'
        });

    } catch (error) {
        console.error('Delete channel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete channel'
        });
    }
});

export default router;
