// backend/src/routes/channels.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Channel from '../models/Channel.js';
import Category from '../models/Category.js';

const router = express.Router();

// Helper function to filter sensitive fields based on role and access toggle
const filterChannelData = (channel, userRole, urlsAccessible) => {
    const channelObj = channel.toObject ? channel.toObject() : channel;

    // Only filter URLs if:
    // 1. User is NOT admin AND
    // 2. User is NOT distributor AND
    // 3. URLs are not accessible
    if (userRole !== 'admin' && userRole !== 'distributor' && !urlsAccessible) {
        delete channelObj.url;
        delete channelObj.imageUrl;
    }

    return channelObj;
};

// Helper to check if user can edit URLs
const canEditUrls = (userRole, urlsAccessible) => {
    return userRole === 'admin' || urlsAccessible;
};

// Get all channels (with optional search and populated categories)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;
        const userRole = req.user.role || 'user';

        let query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const channels = await Channel.find(query)
            .populate('language', 'name')
            .populate('genre', 'name')
            .sort({ lcn: 1 });

        const filteredChannels = channels.map(channel =>
            filterChannelData(channel, userRole, channel.urlsAccessible)
        );

        res.json({
            success: true,
            data: {
                channels: filteredChannels,
                userRole,
                canAccessUrls: userRole === 'admin' || userRole === 'distributor'
            }
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
        const userRole = req.user.role || 'user';

        const channel = await Channel.findById(req.params.id)
            .populate('language', 'name')
            .populate('genre', 'name');

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        const filteredChannel = filterChannelData(channel, userRole, channel.urlsAccessible);

        res.json({
            success: true,
            data: {
                channel: filteredChannel,
                userRole,
                canAccessUrls: userRole === 'admin' || userRole === 'distributor',
                urlsAccessible: channel.urlsAccessible
            }
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
        const userRole = req.user.role || 'user';
        const { name, lcn, language, genre, url, imageUrl } = req.body;

        // Only admin can create channels
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can create channels'
            });
        }

        if (!name || !lcn || !language || !genre || !url || !imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

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
            imageUrl: imageUrl.trim(),
            urlsAccessible: true
        });

        await channel.save();
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
        const userRole = req.user.role || 'user';
        const { name, lcn, language, genre, url, imageUrl } = req.body;

        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        // UPDATED: Allow distributors to edit, but not URLs when disabled
        if (userRole !== 'admin' && userRole !== 'distributor') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit channels'
            });
        }

        // Check if trying to update URLs when they're disabled (non-admin only)
        if ((url !== undefined || imageUrl !== undefined) &&
            !channel.urlsAccessible &&
            userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify stream URLs. URLs are currently locked by administrator.'
            });
        }

        if (!name || !lcn || !language || !genre || !url || !imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

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

        // Update URLs if admin, OR if distributor and URLs are accessible
        if (userRole === 'admin' || channel.urlsAccessible) {
            channel.url = url.trim();
            channel.imageUrl = imageUrl.trim();
        }

        await channel.save();
        await channel.populate('language', 'name');
        await channel.populate('genre', 'name');

        const filteredChannel = filterChannelData(channel, userRole, channel.urlsAccessible);

        res.json({
            success: true,
            message: 'Channel updated successfully',
            data: { channel: filteredChannel }
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
        const userRole = req.user.role || 'user';

        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete channels'
            });
        }

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

// Admin toggle URL accessibility
router.patch('/:id/toggle-urls-access', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role || 'user';

        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can toggle URL access'
            });
        }

        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Channel not found'
            });
        }

        channel.urlsAccessible = !channel.urlsAccessible;
        await channel.save();

        await channel.populate('language', 'name');
        await channel.populate('genre', 'name');

        res.json({
            success: true,
            message: `URL access ${channel.urlsAccessible ? 'enabled' : 'disabled'} for this channel`,
            data: {
                channel,
                urlsAccessible: channel.urlsAccessible
            }
        });

    } catch (error) {
        console.error('Toggle URLs access error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle URL access'
        });
    }
});

export default router;
