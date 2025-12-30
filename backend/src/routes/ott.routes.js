// backend/src/routes/ott.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Ott from '../models/Ott.js';
import Category from '../models/Category.js';

const router = express.Router();

// Helper function to filter sensitive fields based on role and access toggle
const filterOttData = (ott, userRole, urlsAccessible) => {
    const ottObj = ott.toObject ? ott.toObject() : ott;

    // Only filter URLs if:
    // 1. User is NOT admin AND
    // 2. User is NOT distributor AND
    // 3. URLs are not accessible
    if (userRole !== 'admin' && userRole !== 'distributor' && !urlsAccessible) {
        delete ottObj.mediaUrl;
        delete ottObj.horizontalUrl;
        delete ottObj.verticalUrl;
    }

    return ottObj;
};

// Helper to check if user can edit URLs
const canEditUrls = (userRole, urlsAccessible) => {
    return userRole === 'admin' || urlsAccessible;
};

// Get all OTT content (with optional search and populated categories)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, type } = req.query;
        const userRole = req.user.role || 'user';

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

        const filteredOttContent = ottContent.map((ott) =>
            filterOttData(ott, userRole, ott.urlsAccessible)
        );

        res.json({
            success: true,
            data: {
                ottContent: filteredOttContent,
                userRole,
                canAccessUrls: userRole === 'admin' || userRole === 'distributor'
            }
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
        const userRole = req.user.role || 'user';

        const ott = await Ott.findById(req.params.id)
            .populate('genre', 'name')
            .populate('language', 'name');

        if (!ott) {
            return res.status(404).json({
                success: false,
                message: 'OTT content not found'
            });
        }

        const filteredOtt = filterOttData(ott, userRole, ott.urlsAccessible);

        res.json({
            success: true,
            data: {
                ott: filteredOtt,
                userRole,
                canAccessUrls: userRole === 'admin' || userRole === 'distributor',
                urlsAccessible: ott.urlsAccessible
            }
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
        const userRole = req.user.role || 'user';
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

        // Only admin can create content
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can create OTT content'
            });
        }

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
                message: 'Seasons count is required for Web Series and must be at least 1'
            });
        }

        // Create the document
        const ottData = {
            type,
            title: title.trim(),
            genre,
            language,
            mediaUrl: mediaUrl.trim(),
            horizontalUrl: horizontalUrl.trim(),
            verticalUrl: verticalUrl.trim(),
            seasonsCount: type === 'Web Series' ? parseInt(seasonsCount) : 0,
            urlsAccessible: true
        };

        const ott = new Ott(ottData);
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
            message: error.message || 'Failed to create OTT content'
        });
    }
});

// Update OTT content
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role || 'user';
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

        const ott = await Ott.findById(req.params.id);

        if (!ott) {
            return res.status(404).json({
                success: false,
                message: 'OTT content not found'
            });
        }

        // Allow distributors to edit, but not URLs when disabled
        if (userRole !== 'admin' && userRole !== 'distributor') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit OTT content'
            });
        }

        // Check if trying to update URLs when they're disabled (non-admin only)
        if ((mediaUrl !== undefined || horizontalUrl !== undefined || verticalUrl !== undefined) &&
            !ott.urlsAccessible &&
            userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify media URLs. URLs are currently locked by administrator.'
            });
        }

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
                message: 'Seasons count is required for Web Series and must be at least 1'
            });
        }

        ott.type = type;
        ott.title = title.trim();
        ott.genre = genre;
        ott.language = language;

        // Update URLs if admin, OR if distributor and URLs are accessible
        if (userRole === 'admin' || ott.urlsAccessible) {
            ott.mediaUrl = mediaUrl.trim();
            ott.horizontalUrl = horizontalUrl.trim();
            ott.verticalUrl = verticalUrl.trim();
        }

        ott.seasonsCount = type === 'Web Series' ? parseInt(seasonsCount) : 0;

        await ott.save();

        // Populate before sending response
        await ott.populate('genre', 'name');
        await ott.populate('language', 'name');

        const filteredOtt = filterOttData(ott, userRole, ott.urlsAccessible);

        res.json({
            success: true,
            message: 'OTT content updated successfully',
            data: { ott: filteredOtt }
        });

    } catch (error) {
        console.error('Update OTT content error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update OTT content'
        });
    }
});

// Delete OTT content
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role || 'user';

        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete OTT content'
            });
        }

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

// Admin: Toggle all OTT content's URL accessibility
router.patch('/toggle-all-urls-access', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role || 'user';
        const { enable } = req.body;

        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can toggle all URLs access'
            });
        }
        if (typeof enable !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Missing or invalid enable value'
            });
        }

        const result = await Ott.updateMany({}, { urlsAccessible: enable });
        res.json({
            success: true,
            message: `All OTT content URLs have been ${enable ? 'enabled' : 'disabled'}`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Toggle all URLs access error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle all URLs access'
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

        const ott = await Ott.findById(req.params.id);

        if (!ott) {
            return res.status(404).json({
                success: false,
                message: 'OTT content not found'
            });
        }

        ott.urlsAccessible = !ott.urlsAccessible;
        await ott.save();

        // Populate before sending response
        await ott.populate('genre', 'name');
        await ott.populate('language', 'name');

        res.json({
            success: true,
            message: `URL access ${ott.urlsAccessible ? 'enabled' : 'disabled'} for this content`,
            data: {
                ott,
                urlsAccessible: ott.urlsAccessible
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
