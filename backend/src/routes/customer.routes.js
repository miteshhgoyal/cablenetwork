// backend/src/routes/customer.js
import express from 'express';
import User from '../models/User.js';
import Subscriber from '../models/Subscriber.js';
import Ott from '../models/Ott.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // ✅ FIX: Remove fallback - use only env variable
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const subscriber = await Subscriber.findById(decoded.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        if (new Date() > new Date(subscriber.expiryDate)) {
            return res.status(403).json({
                success: false,
                message: 'Subscription expired'
            });
        }

        req.user = {
            id: subscriber._id,
            resellerId: subscriber.resellerId
        };

        next();
    } catch (error) {
        console.error('Auth error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const generateProxyUrl = (originalUrl) => {
    if (!originalUrl) return null;
    const API_URL = process.env.API_URL || 'http://localhost:8000';
    const isM3U8 = originalUrl.includes('.m3u8') || originalUrl.includes('m3u');
    const proxyEndpoint = isM3U8 ? '/api/proxy/m3u8' : '/api/proxy/stream';
    return `${API_URL}${proxyEndpoint}?url=${encodeURIComponent(originalUrl)}`;
};

const buildChannelResponse = (channelMap) => {
    return Array.from(channelMap.values()).map(channel => ({
        _id: channel._id,
        name: channel.name,
        lcn: channel.lcn,
        imageUrl: channel.imageUrl,
        url: channel.url,
        proxyUrl: generateProxyUrl(channel.url),
        genre: channel.genre,
        language: channel.language,
        packageNames: channel.packageNames
    }));
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// LOGIN ROUTE WITH MAC VALIDATION
router.post('/login', async (req, res) => {
    try {
        const { partnerCode, macAddress, deviceName } = req.body;

        if (!partnerCode || !macAddress) {
            return res.status(400).json({
                success: false,
                message: 'Partner code and MAC address required'
            });
        }

        // Find reseller by partner code
        const reseller = await User.findOne({
            partnerCode: partnerCode.trim(),
            role: 'reseller',
            status: 'Active'
        }).populate('packages');

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Invalid partner code'
            });
        }

        if (!reseller.packages || reseller.packages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Reseller has no packages available'
            });
        }

        // ==========================================
        // MAC ADDRESS VALIDATION LOGIC
        // ==========================================
        const mac = macAddress.trim().toLowerCase();
        let subscriber = await Subscriber.findOne({ macAddress: mac });

        // CASE 1: MAC not found - Create Fresh subscriber
        if (!subscriber) {
            subscriber = new Subscriber({
                resellerId: reseller._id,
                subscriberName: deviceName || 'User',
                serialNumber: mac,
                macAddress: mac,
                packages: reseller.packages.map(pkg => pkg._id),
                primaryPackageId: reseller.packages[0]._id,
                status: 'Inactive',  // Default to Fresh
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            await subscriber.save();

            return res.status(201).json({
                success: false,
                code: 'MAC_INACTIVE',
                message: 'Device registered successfully. Please contact admin/reseller to activate your account.',
            });
        }

        // CASE 2: MAC found but NOT Active
        if (subscriber.status !== 'Active') {
            return res.status(403).json({
                success: false,
                code: 'MAC_INACTIVE',
                message: `Your device is ${subscriber.status}. Please contact admin/reseller to activate.`,
            });
        }

        // CASE 3: MAC found and Active - Check expiry
        if (new Date() > new Date(subscriber.expiryDate)) {
            return res.status(403).json({
                success: false,
                code: 'SUBSCRIPTION_EXPIRED',
                message: 'Subscription expired. Please contact admin/reseller to renew.',
            });
        }

        // ==========================================
        // PROCEED WITH LOGIN (Active subscriber)
        // ==========================================

        // Populate ALL packages and their channels
        await subscriber.populate({
            path: 'packages',
            select: 'name cost duration channels',
            populate: {
                path: 'channels',
                populate: [
                    { path: 'language', select: 'name' },
                    { path: 'genre', select: 'name' }
                ]
            }
        });

        // Create channels map with package information
        const channelMap = new Map();
        const packagesList = [];

        subscriber.packages.forEach(pkg => {
            packagesList.push({
                _id: pkg._id,
                name: pkg.name,
                cost: pkg.cost,
                duration: pkg.duration,
                channelCount: pkg.channels?.length || 0
            });

            if (pkg.channels && Array.isArray(pkg.channels)) {
                pkg.channels.forEach(channel => {
                    if (channel._id) {
                        const channelId = channel._id.toString();

                        if (channelMap.has(channelId)) {
                            const existing = channelMap.get(channelId);
                            if (!existing.packageNames.includes(pkg.name)) {
                                existing.packageNames.push(pkg.name);
                            }
                        } else {
                            channelMap.set(channelId, {
                                _id: channel._id,
                                name: channel.name,
                                lcn: channel.lcn,
                                imageUrl: channel.imageUrl,
                                url: channel.url,
                                genre: channel.genre,
                                language: channel.language,
                                packageNames: [pkg.name]
                            });
                        }
                    }
                });
            }
        });

        const channels = buildChannelResponse(channelMap);

        await subscriber.populate({
            path: 'primaryPackageId',
            select: 'name'
        });

        // Generate token
        const token = jwt.sign(
            { id: subscriber._id, resellerId: reseller._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            data: {
                subscriber: {
                    name: subscriber.subscriberName,
                    subscriberName: subscriber.subscriberName, // Add this
                    expiryDate: subscriber.expiryDate,
                    packageName: subscriber.primaryPackageId?.name || 'Multi-Package',
                    totalPackages: subscriber.packages.length,
                    totalChannels: channels.length,
                    macAddress: subscriber.macAddress,
                    deviceName: deviceName,
                    status: subscriber.status
                },
                channels,
                packagesList,
                token,
                serverInfo: {
                    proxyEnabled: true,
                    apiUrl: process.env.API_URL || 'http://localhost:8000'
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// ==========================================
// PROTECTED ROUTES
// ==========================================

// Refresh channels route
router.get('/refresh-channels', authenticateToken, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.user.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        const reseller = await User.findById(subscriber.resellerId).populate('packages');

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Reseller not found'
            });
        }

        const mergedPackages = [
            ...new Map(
                [
                    ...subscriber.packages,
                    ...reseller.packages.map(pkg => pkg._id)
                ].map(id => [id.toString(), id])
            ).values()
        ];

        subscriber.packages = mergedPackages;
        await subscriber.save();

        await subscriber.populate({
            path: 'packages',
            select: 'name cost duration channels',
            populate: {
                path: 'channels',
                populate: [
                    { path: 'language', select: 'name' },
                    { path: 'genre', select: 'name' }
                ]
            }
        });

        const channelMap = new Map();
        const packagesList = [];

        subscriber.packages.forEach(pkg => {
            packagesList.push({
                _id: pkg._id,
                name: pkg.name,
                cost: pkg.cost,
                duration: pkg.duration,
                channelCount: pkg.channels?.length || 0
            });

            if (pkg.channels && Array.isArray(pkg.channels)) {
                pkg.channels.forEach(channel => {
                    if (channel._id) {
                        const channelId = channel._id.toString();

                        if (channelMap.has(channelId)) {
                            const existing = channelMap.get(channelId);
                            if (!existing.packageNames.includes(pkg.name)) {
                                existing.packageNames.push(pkg.name);
                            }
                        } else {
                            channelMap.set(channelId, {
                                _id: channel._id,
                                name: channel.name,
                                lcn: channel.lcn,
                                imageUrl: channel.imageUrl,
                                url: channel.url,
                                genre: channel.genre,
                                language: channel.language,
                                packageNames: [pkg.name]
                            });
                        }
                    }
                });
            }
        });

        const channels = buildChannelResponse(channelMap);

        await subscriber.populate({
            path: 'primaryPackageId',
            select: 'name'
        });

        res.json({
            success: true,
            data: {
                subscriber: {
                    name: subscriber.subscriberName,
                    expiryDate: subscriber.expiryDate,
                    packageName: subscriber.primaryPackageId?.name || 'Multi-Package',
                    totalPackages: subscriber.packages.length,
                    totalChannels: channels.length
                },
                channels,
                packagesList,
                serverInfo: {
                    proxyEnabled: true,
                    apiUrl: process.env.API_URL || 'http://localhost:8000'
                }
            }
        });

    } catch (error) {
        console.error('Refresh channels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh channels'
        });
    }
});

// Update location endpoint
router.post('/update-location', authenticateToken, async (req, res) => {
    try {
        const { latitude, longitude, address } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude required'
            });
        }

        const subscriber = await Subscriber.findByIdAndUpdate(
            req.user.id,
            {
                lastLocation: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                    timestamp: new Date(),
                    address: address || null
                },
                $push: {
                    locationHistory: {
                        $each: [{
                            coordinates: [longitude, latitude],
                            timestamp: new Date(),
                            address: address || null
                        }],
                        $slice: -100
                    }
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Location updated',
            data: {
                coordinates: subscriber.lastLocation.coordinates,
                timestamp: subscriber.lastLocation.timestamp
            }
        });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update location'
        });
    }
});

// Update device security info endpoint
router.post('/update-security-info', authenticateToken, async (req, res) => {
    try {
        const { isRooted, isVPNActive, deviceModel, osVersion, appVersion } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        await Subscriber.findByIdAndUpdate(req.user.id, {
            deviceInfo: {
                isRooted: isRooted || false,
                isVPNActive: isVPNActive || false,
                lastIPAddress: clientIP,
                deviceModel: deviceModel || '',
                osVersion: osVersion || '',
                appVersion: appVersion || ''
            }
        });

        if (isRooted || isVPNActive) {
            console.warn(`⚠️ Security Alert: Subscriber ${req.user.id}`, {
                isRooted,
                isVPNActive,
                ip: clientIP
            });
        }

        res.json({
            success: true,
            message: 'Security info updated',
            warnings: {
                rooted: isRooted,
                vpn: isVPNActive
            }
        });
    } catch (error) {
        console.error('Update security info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update security info'
        });
    }
});

// Get subscriber profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.user.id)
            .populate('primaryPackageId', 'name cost duration')
            .populate('packages', 'name')
            .select('subscriberName macAddress status expiryDate lastLocation deviceInfo');

        res.json({
            success: true,
            data: {
                name: subscriber.subscriberName,
                macAddress: subscriber.macAddress,
                status: subscriber.status,
                expiryDate: subscriber.expiryDate,
                primaryPackage: subscriber.primaryPackageId,
                totalPackages: subscriber.packages.length,
                lastLocation: subscriber.lastLocation,
                deviceInfo: subscriber.deviceInfo
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

// ==========================================
// OTT CONTENT ROUTES (Movies & Web Series)
// ==========================================

// Get all movies with genre grouping
router.get('/movies', authenticateToken, async (req, res) => {
    try {
        const { genre, language } = req.query;

        const filter = { type: 'Movie' };
        if (genre) filter.genre = genre;
        if (language) filter.language = language;

        const movies = await Ott.find(filter)
            .populate('genre', 'name')
            .populate('language', 'name')
            .sort({ createdAt: -1 });

        // Group by genre for category-wise display
        const groupedByGenre = movies.reduce((acc, movie) => {
            const genreName = movie.genre?.name || 'Uncategorized';
            if (!acc[genreName]) {
                acc[genreName] = [];
            }
            acc[genreName].push({
                _id: movie._id,
                title: movie.title,
                genre: movie.genre,
                language: movie.language,
                mediaUrl: movie.mediaUrl,
                horizontalUrl: movie.horizontalUrl,
                verticalUrl: movie.verticalUrl
            });
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                movies,
                groupedByGenre,
                totalCount: movies.length
            }
        });
    } catch (error) {
        console.error('Get movies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch movies'
        });
    }
});

// Get all web series with genre grouping
router.get('/series', authenticateToken, async (req, res) => {
    try {
        const { genre, language } = req.query;

        const filter = { type: 'Web Series' };
        if (genre) filter.genre = genre;
        if (language) filter.language = language;

        const series = await Ott.find(filter)
            .populate('genre', 'name')
            .populate('language', 'name')
            .sort({ createdAt: -1 });

        // Group by genre for category-wise display
        const groupedByGenre = series.reduce((acc, show) => {
            const genreName = show.genre?.name || 'Uncategorized';
            if (!acc[genreName]) {
                acc[genreName] = [];
            }
            acc[genreName].push({
                _id: show._id,
                title: show.title,
                genre: show.genre,
                language: show.language,
                mediaUrl: show.mediaUrl,
                horizontalUrl: show.horizontalUrl,
                verticalUrl: show.verticalUrl,
                seasonsCount: show.seasonsCount
            });
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                series,
                groupedByGenre,
                totalCount: series.length
            }
        });
    } catch (error) {
        console.error('Get series error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch series'
        });
    }
});

// Get single OTT content by ID
router.get('/ott/:id', authenticateToken, async (req, res) => {
    try {
        const content = await Ott.findById(req.params.id)
            .populate('genre', 'name')
            .populate('language', 'name');

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        res.json({
            success: true,
            data: content
        });
    } catch (error) {
        console.error('Get OTT content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch content'
        });
    }
});

// Check subscription status (called on app launch)
router.get('/check-status', authenticateToken, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.user.id)
            .select('subscriberName status expiryDate macAddress deviceInfo')
            .lean();

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                code: 'NOT_FOUND',
                message: 'Subscriber not found'
            });
        }

        // Check if expired
        const now = new Date();
        const expiryDate = new Date(subscriber.expiryDate);
        const isExpired = now > expiryDate;

        // Check if inactive
        if (subscriber.status !== 'Active') {
            return res.json({
                success: false,
                code: 'INACTIVE',
                message: 'Your subscription is inactive',
                data: {
                    status: subscriber.status,
                    expiryDate: subscriber.expiryDate,
                    subscriberName: subscriber.subscriberName,
                    macAddress: subscriber.macAddress,
                    deviceInfo: subscriber.deviceInfo
                }
            });
        }

        // Check if expired
        if (isExpired) {
            return res.json({
                success: false,
                code: 'EXPIRED',
                message: 'Your subscription has expired',
                data: {
                    status: subscriber.status,
                    expiryDate: subscriber.expiryDate,
                    subscriberName: subscriber.subscriberName,
                    macAddress: subscriber.macAddress,
                    deviceInfo: subscriber.deviceInfo
                }
            });
        }

        res.json({
            success: true,
            code: 'ACTIVE',
            data: {
                status: subscriber.status,
                expiryDate: subscriber.expiryDate,
                subscriberName: subscriber.subscriberName,
                macAddress: subscriber.macAddress,
                daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
            }
        });

    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check status'
        });
    }
});

export default router;
