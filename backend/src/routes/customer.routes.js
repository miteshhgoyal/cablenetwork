// backend/src/routes/customer.js
import express from 'express';
import User from '../models/User.js';
import Subscriber from '../models/Subscriber.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ==========================================
// AUTHENTICATION MIDDLEWARE (INLINE)
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Find subscriber
        const subscriber = await Subscriber.findById(decoded.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Check expiry
        if (new Date() > new Date(subscriber.expiryDate)) {
            return res.status(403).json({
                success: false,
                message: 'Subscription expired'
            });
        }

        // Attach user to request
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

        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Helper function to generate proxy URL
const generateProxyUrl = (originalUrl) => {
    if (!originalUrl) return null;

    const API_URL = process.env.API_URL || 'http://localhost:8000';

    // Check if it's an M3U8 stream
    const isM3U8 = originalUrl.includes('.m3u8') || originalUrl.includes('m3u');
    const proxyEndpoint = isM3U8 ? '/api/proxy/m3u8' : '/api/proxy/stream';

    return `${API_URL}${proxyEndpoint}?url=${encodeURIComponent(originalUrl)}`;
};

// Helper function to build channel response with proxy URLs
const buildChannelResponse = (channelMap) => {
    return Array.from(channelMap.values()).map(channel => ({
        _id: channel._id,
        name: channel.name,
        lcn: channel.lcn,
        imageUrl: channel.imageUrl,
        url: channel.url,
        proxyUrl: generateProxyUrl(channel.url), // Add proxy URL
        genre: channel.genre,
        language: channel.language,
        packageNames: channel.packageNames
    }));
};

// ==========================================
// PUBLIC ROUTES (NO AUTH REQUIRED)
// ==========================================

// Simple Login with Partner Code + MAC Address
router.post('/login', async (req, res) => {
    try {
        const { partnerCode, macAddress, deviceName } = req.body;

        if (!partnerCode || !macAddress) {
            return res.status(400).json({
                success: false,
                message: 'Partner code and device info required'
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

        // Check if reseller has packages
        if (!reseller.packages || reseller.packages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Reseller has no packages available'
            });
        }

        // Find or create subscriber
        let subscriber = await Subscriber.findOne({ macAddress: macAddress.trim() });

        if (!subscriber) {
            // Create new subscriber with ALL reseller packages
            subscriber = new Subscriber({
                resellerId: reseller._id,
                subscriberName: deviceName || 'User',
                serialNumber: macAddress.trim(),
                macAddress: macAddress.trim(),
                packages: reseller.packages.map(pkg => pkg._id),
                primaryPackageId: reseller.packages[0]._id,
                status: 'Active',
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await subscriber.save();
        } else {
            // Update existing subscriber to include all reseller packages
            const mergedPackages = [
                ...new Map(
                    [
                        ...subscriber.packages,
                        ...reseller.packages.map(pkg => pkg._id)
                    ].map(id => [id.toString(), id])
                ).values()
            ];

            subscriber.packages = mergedPackages;

            if (!subscriber.primaryPackageId) {
                subscriber.primaryPackageId = reseller.packages[0]._id;
            }

            await subscriber.save();
        }

        // Check expiry
        if (new Date() > new Date(subscriber.expiryDate)) {
            return res.status(403).json({
                success: false,
                message: 'Subscription expired. Contact your reseller.'
            });
        }

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
            // Store package info
            packagesList.push({
                _id: pkg._id,
                name: pkg.name,
                cost: pkg.cost,
                duration: pkg.duration,
                channelCount: pkg.channels?.length || 0
            });

            // Process channels with package tracking
            if (pkg.channels && Array.isArray(pkg.channels)) {
                pkg.channels.forEach(channel => {
                    if (channel._id) {
                        const channelId = channel._id.toString();

                        if (channelMap.has(channelId)) {
                            // Channel already exists, add this package name
                            const existing = channelMap.get(channelId);
                            if (!existing.packageNames.includes(pkg.name)) {
                                existing.packageNames.push(pkg.name);
                            }
                        } else {
                            // New channel, create with package info
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

        // Build channels with proxy URLs
        const channels = buildChannelResponse(channelMap);

        // Get primary package info
        await subscriber.populate({
            path: 'primaryPackageId',
            select: 'name'
        });

        // Generate token
        const token = jwt.sign(
            { id: subscriber._id, resellerId: reseller._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

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
                channels, // Now includes packageNames AND proxyUrl
                packagesList,
                token,
                // Add server info for client reference
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
// PROTECTED ROUTES (AUTH REQUIRED)
// ==========================================

// Refresh channels route
router.get('/refresh-channels', authenticateToken, async (req, res) => {
    try {
        // Find subscriber (already verified by middleware)
        const subscriber = await Subscriber.findById(req.user.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        // Find reseller to get latest packages
        const reseller = await User.findById(subscriber.resellerId).populate('packages');

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Reseller not found'
            });
        }

        // Update subscriber packages with latest from reseller
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

        // Build channels map with package tracking
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

        // Build channels with proxy URLs
        const channels = buildChannelResponse(channelMap);

        // Get primary package info
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
                channels, // Now includes proxyUrl
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
                        $slice: -100 // Keep only last 100 locations
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

        // Log security warnings if device is compromised
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

export default router;
