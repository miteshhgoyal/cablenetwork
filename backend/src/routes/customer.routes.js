import express from 'express';
import User from '../models/User.js';
import Subscriber from '../models/Subscriber.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Remove expired packages from subscriber
 */
const removeExpiredPackages = async (subscriber) => {
    const now = new Date();
    let hadChanges = false;

    if (!subscriber.packages || subscriber.packages.length === 0) {
        return { hadChanges: false, subscriber };
    }

    await subscriber.populate('packages', 'duration');

    const validPackages = [];
    const expiredPackageNames = [];

    for (const pkg of subscriber.packages) {
        const assignedDate = subscriber.createdAt || now;
        const packageDuration = pkg.duration || 30;
        const packageExpiry = new Date(assignedDate.getTime() + packageDuration * 24 * 60 * 60 * 1000);

        if (now > packageExpiry) {
            expiredPackageNames.push(pkg.name || pkg._id);
            hadChanges = true;
        } else {
            validPackages.push(pkg._id);
        }
    }

    if (hadChanges) {
        subscriber.packages = validPackages;
        console.log(`Removed ${expiredPackageNames.length} expired packages from subscriber ${subscriber.subscriberName}`, expiredPackageNames);

        if (validPackages.length === 0) {
            subscriber.status = 'Inactive';
            console.log(`Subscriber ${subscriber.subscriberName} set to Inactive - no packages remaining`);
        }

        if (subscriber.primaryPackageId) {
            const primaryExists = validPackages.some(pkgId => pkgId.toString() === subscriber.primaryPackageId.toString());
            if (!primaryExists) {
                subscriber.primaryPackageId = validPackages.length > 0 ? validPackages[0] : null;
                console.log(`Updated primaryPackageId for subscriber ${subscriber.subscriberName}`);
            }
        }

        await subscriber.save();
    }

    return { hadChanges, subscriber };
};

/**
 * 🔧 NEW: Check upline status hierarchy using partnerCode
 * Returns: { isAllowed, code, message }
 */
const checkUplinerStatus = async (partnerCode) => {
    // Find reseller by partnerCode
    const reseller = await User.findOne({
        partnerCode: partnerCode.trim(),
        role: 'reseller'
    }).populate('createdBy', 'status name role');

    if (!reseller) {
        return {
            isAllowed: false,
            code: 'INVALID_PARTNER_CODE',
            message: 'Invalid partner code'
        };
    }

    // Check reseller status
    if (reseller.status !== 'Active') {
        return {
            isAllowed: false,
            code: 'RESELLER_INACTIVE',
            message: `Your reseller account is inactive. Please contact your reseller or admin to reactivate the account.`,
            resellerName: reseller.name
        };
    }

    // Check distributor status (if reseller has an upliner)
    if (reseller.createdBy) {
        if (reseller.createdBy.role === 'distributor' && reseller.createdBy.status !== 'Active') {
            return {
                isAllowed: false,
                code: 'DISTRIBUTOR_INACTIVE',
                message: `The distributor account (${reseller.createdBy.name}) for your reseller is inactive. Please contact admin.`,
                distributorName: reseller.createdBy.name
            };
        }
    }

    // All checks passed
    return {
        isAllowed: true,
        reseller: reseller
    };
};

const generateProxyUrl = (originalUrl) => {
    if (!originalUrl) return null;
    const API_URL = process.env.API_URL || 'http://localhost:8000';
    const isM3U8 = originalUrl.includes('.m3u8') || originalUrl.includes('m3u');
    const proxyEndpoint = isM3U8 ? '/api/proxy/m3u8' : '/api/proxy/stream';
    return `${API_URL}${proxyEndpoint}?url=${encodeURIComponent(originalUrl)}`;
};

const buildChannelResponse = (channelMap) => {
    return Array.from(channelMap.values()).map(channel => ({
        id: channel.id,
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
            partnerCode: subscriber.partnerCode
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
// PUBLIC ROUTES
// ==========================================

/**
 * 🔧 FULLY FIXED: LOGIN ROUTE
 * Now checks upline status using partnerCode (not resellerId)
 */
router.post('/login', async (req, res) => {
    try {
        const { partnerCode, macAddress, deviceName, customMac } = req.body;

        if (!partnerCode || !macAddress) {
            return res.status(400).json({
                success: false,
                message: 'Partner code and device MAC address required'
            });
        }

        // 🔧 FIXED: Check upline status hierarchy using partnerCode
        const uplinerCheck = await checkUplinerStatus(partnerCode);

        if (!uplinerCheck.isAllowed) {
            return res.status(403).json({
                success: false,
                code: uplinerCheck.code,
                message: uplinerCheck.message
            });
        }

        const reseller = uplinerCheck.reseller;
        const deviceMac = macAddress.trim().toLowerCase();
        let subscriber;
        let usingCustomMac = false;

        // ========================================
        // CASE 1: CUSTOM MAC PROVIDED
        // ========================================
        if (customMac) {
            const customMacAddress = customMac.trim().toLowerCase();

            const activeSubscriber = await Subscriber.findOne({
                serialNumber: customMacAddress,
                status: 'Active'
            });

            if (!activeSubscriber) {
                return res.status(404).json({
                    success: false,
                    code: 'CUSTOM_MAC_NOT_ACTIVE',
                    message: `Custom MAC not found or not active. MAC: ${customMac}. Ensure MAC address is correct. The account is Active.`
                });
            }

            const { hadChanges } = await removeExpiredPackages(activeSubscriber);
            if (hadChanges) {
                console.log('Cleaned expired packages from custom MAC:', customMacAddress);
            }

            if (activeSubscriber.packages.length === 0) {
                return res.status(403).json({
                    success: false,
                    code: 'CUSTOM_MAC_NO_PACKAGES',
                    message: `Custom MAC has no active packages. ${customMac} packages have expired. Please contact admin to renew.`
                });
            }

            if (new Date() > new Date(activeSubscriber.expiryDate)) {
                return res.status(403).json({
                    success: false,
                    code: 'CUSTOM_MAC_EXPIRED',
                    message: `Custom MAC subscription expired. ${customMac} on ${new Date(activeSubscriber.expiryDate).toLocaleDateString()}. Use another active MAC or contact admin.`
                });
            }

            subscriber = await Subscriber.findOne({
                partnerCode: partnerCode.trim(),
                serialNumber: deviceMac
            });

            if (!subscriber) {
                subscriber = new Subscriber({
                    resellerId: reseller._id,
                    partnerCode: partnerCode.trim(),
                    subscriberName: deviceName || 'User',
                    serialNumber: deviceMac,
                    macAddress: deviceMac,
                    packages: activeSubscriber.packages,
                    primaryPackageId: activeSubscriber.primaryPackageId,
                    status: 'Fresh',
                    expiryDate: activeSubscriber.expiryDate
                });
                await subscriber.save();
            }

            subscriber.macAddress = customMacAddress;
            subscriber.partnerCode = partnerCode.trim();
            subscriber.deviceInfo = {
                ...subscriber.deviceInfo,
                lastIPAddress: req.ip || req.connection.remoteAddress,
                deviceModel: deviceName || subscriber.deviceInfo?.deviceModel
            };
            await subscriber.save();

            subscriber = activeSubscriber;
            usingCustomMac = true;
            console.log(`Login with custom MAC ${customMacAddress} from device ${deviceMac}`);
        }
        // ========================================
        // CASE 2: NO CUSTOM MAC - USE OWN DEVICE MAC
        // ========================================
        else {
            const existingSubscriber = await Subscriber.findOne({ serialNumber: deviceMac });

            // STEP 2A: MAC exists but under DIFFERENT partner code
            if (existingSubscriber && existingSubscriber.partnerCode !== partnerCode.trim()) {
                console.log(`MAC ${deviceMac} switching from partner code ${existingSubscriber.partnerCode} to ${partnerCode}`);

                // 🔧 FIXED: Check new partner code's upline before allowing switch
                const newUplinerCheck = await checkUplinerStatus(partnerCode);
                if (!newUplinerCheck.isAllowed) {
                    return res.status(403).json({
                        success: false,
                        code: newUplinerCheck.code,
                        message: `Cannot switch to this partner code: ${newUplinerCheck.message}`
                    });
                }

                existingSubscriber.resellerId = reseller._id;
                existingSubscriber.partnerCode = partnerCode.trim();
                existingSubscriber.status = 'Fresh';
                existingSubscriber.packages = [];
                existingSubscriber.primaryPackageId = null;
                existingSubscriber.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                await existingSubscriber.save();

                console.log(`MAC ${deviceMac} moved to new partner code: ${partnerCode}`);

                return res.status(201).json({
                    success: false,
                    code: 'MAC_SWITCHED_PARTNER',
                    message: `Device switched to new partner code successfully! Your device is now registered as Fresh under partner code ${partnerCode}. Contact your new reseller/admin to assign packages and activate your account.`,
                    data: {
                        deviceMac: deviceMac,
                        status: 'Fresh',
                        partnerCode: partnerCode,
                        switchedFrom: 'Different partner code',
                        canUseCustomMac: true,
                        hasPackages: false
                    }
                });
            }

            // STEP 2B: MAC exists under SAME partner code
            if (existingSubscriber && existingSubscriber.partnerCode === partnerCode.trim()) {
                subscriber = existingSubscriber;

                const { hadChanges } = await removeExpiredPackages(subscriber);
                if (hadChanges) {
                    console.log('Cleaned expired packages from device MAC:', deviceMac);
                }

                // Auto-activate if Fresh with packages
                if (subscriber.status === 'Fresh' && subscriber.packages && subscriber.packages.length > 0) {
                    subscriber.status = 'Active';
                    await subscriber.save();
                    console.log('Auto-activated Fresh subscriber with packages:', deviceMac);
                }

                // Status checks
                if (subscriber.status === 'Fresh') {
                    return res.status(403).json({
                        success: false,
                        code: 'MAC_FRESH',
                        message: 'Your device is Fresh. Please contact admin/reseller to assign packages and activate.',
                        data: {
                            deviceMac: deviceMac,
                            status: subscriber.status,
                            canUseCustomMac: true,
                            hasPackages: subscriber.packages?.length > 0
                        }
                    });
                }

                if (subscriber.status === 'Inactive') {
                    return res.status(403).json({
                        success: false,
                        code: 'MAC_INACTIVE',
                        message: 'Your device is Inactive. Please contact admin/reseller to activate.',
                        data: {
                            deviceMac: deviceMac,
                            status: subscriber.status,
                            canUseCustomMac: true,
                            hasPackages: subscriber.packages?.length > 0
                        }
                    });
                }

                if (new Date() > new Date(subscriber.expiryDate)) {
                    return res.status(403).json({
                        success: false,
                        code: 'SUBSCRIPTION_EXPIRED',
                        message: `Subscription expired on ${new Date(subscriber.expiryDate).toLocaleDateString()}. Please contact admin/reseller to renew.`,
                        data: {
                            deviceMac: deviceMac,
                            status: subscriber.status,
                            expiryDate: subscriber.expiryDate,
                            canUseCustomMac: true
                        }
                    });
                }

                if (!subscriber.packages || subscriber.packages.length === 0) {
                    return res.status(403).json({
                        success: false,
                        code: 'NO_PACKAGES',
                        message: 'Your device is Active but no packages are assigned. All packages may have expired. Please contact admin/reseller to assign new packages.',
                        data: {
                            deviceMac: deviceMac,
                            status: subscriber.status,
                            hasPackages: false,
                            canUseCustomMac: true
                        }
                    });
                }

                subscriber.deviceInfo = {
                    ...subscriber.deviceInfo,
                    lastIPAddress: req.ip || req.connection.remoteAddress,
                    deviceModel: deviceName || subscriber.deviceInfo?.deviceModel
                };
                await subscriber.save();
                console.log('Login with own device MAC:', deviceMac);
            }

            // STEP 2C: MAC doesn't exist anywhere - Create Fresh subscriber
            if (!existingSubscriber) {
                subscriber = new Subscriber({
                    resellerId: reseller._id,
                    partnerCode: partnerCode.trim(),
                    subscriberName: deviceName || 'User',
                    serialNumber: deviceMac,
                    macAddress: deviceMac,
                    packages: [],
                    primaryPackageId: null,
                    status: 'Fresh',
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });
                await subscriber.save();

                console.log('New Fresh subscriber created:', deviceMac);

                return res.status(201).json({
                    success: false,
                    code: 'MAC_FRESH',
                    message: `Device registered successfully as Fresh. Please contact admin/reseller to assign packages and activate your account.`,
                    data: {
                        deviceMac: deviceMac,
                        status: 'Fresh',
                        canUseCustomMac: true,
                        hasPackages: false
                    }
                });
            }
        }

        // ========================================
        // PROCEED WITH LOGIN - BUILD RESPONSE
        // ========================================
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

        if (subscriber.packages && subscriber.packages.length > 0) {
            subscriber.packages.forEach(pkg => {
                packagesList.push({
                    id: pkg._id,
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
                                    id: channel._id,
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
        }

        const channels = buildChannelResponse(channelMap);

        await subscriber.populate({
            path: 'primaryPackageId',
            select: 'name'
        });

        const token = jwt.sign(
            {
                id: subscriber._id,
                partnerCode: subscriber.partnerCode
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            data: {
                subscriber: {
                    name: subscriber.subscriberName,
                    subscriberName: subscriber.subscriberName,
                    expiryDate: subscriber.expiryDate,
                    packageName: subscriber.primaryPackageId?.name || 'Multi-Package',
                    totalPackages: subscriber.packages.length,
                    totalChannels: channels.length,
                    macAddress: subscriber.serialNumber,
                    currentMac: usingCustomMac ? customMac : deviceMac,
                    deviceName: deviceName,
                    status: subscriber.status,
                    usingCustomMac: usingCustomMac,
                    partnerCode: subscriber.partnerCode
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
            message: 'Login failed. Please try again.'
        });
    }
});

/**
 * 🔧 FIXED: Check subscription status
 * Uses partnerCode to check upline status
 */
router.get('/check-status', authenticateToken, async (req, res) => {
    try {
        let subscriber = await Subscriber.findById(req.user.id)
            .select('subscriberName status expiryDate macAddress deviceInfo packages createdAt partnerCode')
            .populate('packages', 'name duration');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                code: 'NOT_FOUND',
                message: 'Subscriber not found'
            });
        }

        // 🔧 FIXED: Check upline status using partnerCode
        if (subscriber.partnerCode) {
            const uplinerCheck = await checkUplinerStatus(subscriber.partnerCode);

            if (!uplinerCheck.isAllowed) {
                return res.json({
                    success: false,
                    code: uplinerCheck.code,
                    message: uplinerCheck.message,
                    data: {
                        status: 'Inactive',
                        subscriberName: subscriber.subscriberName,
                        partnerCode: subscriber.partnerCode
                    }
                });
            }
        }

        const { hadChanges } = await removeExpiredPackages(subscriber);
        if (hadChanges) {
            console.log('Check-status: Cleaned expired packages from subscriber', subscriber.subscriberName);
        }

        subscriber = await Subscriber.findById(req.user.id)
            .select('subscriberName status expiryDate macAddress deviceInfo packages partnerCode')
            .lean();

        const now = new Date();
        const expiryDate = new Date(subscriber.expiryDate);
        const isExpired = now > expiryDate;

        // Auto-activate if Fresh with packages
        if (subscriber.status === 'Fresh' && subscriber.packages && subscriber.packages.length > 0) {
            await Subscriber.findByIdAndUpdate(req.user.id, { status: 'Active' });
            subscriber.status = 'Active';
            console.log('Auto-activated Fresh subscriber on status check:', req.user.id);
        }

        if (subscriber.status === 'Fresh') {
            return res.json({
                success: false,
                code: 'FRESH',
                message: 'Your subscription is Fresh. Please contact admin to assign packages and activate.',
                data: {
                    status: subscriber.status,
                    expiryDate: subscriber.expiryDate,
                    subscriberName: subscriber.subscriberName,
                    macAddress: subscriber.macAddress,
                    deviceInfo: subscriber.deviceInfo,
                    totalPackages: subscriber.packages?.length || 0,
                    partnerCode: subscriber.partnerCode
                }
            });
        }

        if (subscriber.status === 'Inactive') {
            return res.json({
                success: false,
                code: 'INACTIVE',
                message: 'Your subscription is inactive',
                data: {
                    status: subscriber.status,
                    expiryDate: subscriber.expiryDate,
                    subscriberName: subscriber.subscriberName,
                    macAddress: subscriber.macAddress,
                    deviceInfo: subscriber.deviceInfo,
                    totalPackages: subscriber.packages?.length || 0,
                    partnerCode: subscriber.partnerCode
                }
            });
        }

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
                    deviceInfo: subscriber.deviceInfo,
                    totalPackages: subscriber.packages?.length || 0,
                    partnerCode: subscriber.partnerCode
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
                totalPackages: subscriber.packages?.length || 0,
                daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
                partnerCode: subscriber.partnerCode
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

/**
 * Refresh channels route
 */
router.get('/refresh-channels', authenticateToken, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.user.id)
            .populate({
                path: 'packages',
                select: 'name cost duration channels',
                populate: {
                    path: 'channels',
                    populate: [
                        { path: 'language', select: 'name' },
                        { path: 'genre', select: 'name' }
                    ]
                }
            })
            .populate({
                path: 'primaryPackageId',
                select: 'name'
            });

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        const channelMap = new Map();
        const packagesList = [];

        if (subscriber.packages && subscriber.packages.length > 0) {
            subscriber.packages.forEach(pkg => {
                packagesList.push({
                    id: pkg._id,
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
                                    id: channel._id,
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
        }

        const channels = buildChannelResponse(channelMap);

        res.json({
            success: true,
            data: {
                subscriber: {
                    name: subscriber.subscriberName,
                    subscriberName: subscriber.subscriberName,
                    expiryDate: subscriber.expiryDate,
                    packageName: subscriber.primaryPackageId?.name || 'Multi-Package',
                    totalPackages: subscriber.packages.length,
                    totalChannels: channels.length,
                    macAddress: subscriber.macAddress,
                    status: subscriber.status,
                    partnerCode: subscriber.partnerCode
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

/**
 * Update location endpoint
 */
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

/**
 * Update device security info endpoint
 */
router.post('/update-security-info', authenticateToken, async (req, res) => {
    try {
        const { isRooted, isVPNActive, deviceModel, osVersion, appVersion } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        await Subscriber.findByIdAndUpdate(req.user.id, {
            'deviceInfo.isRooted': isRooted || false,
            'deviceInfo.isVPNActive': isVPNActive || false,
            'deviceInfo.lastIPAddress': clientIP,
            'deviceInfo.deviceModel': deviceModel || '',
            'deviceInfo.osVersion': osVersion || '',
            'deviceInfo.appVersion': appVersion || ''
        });

        if (isRooted || isVPNActive) {
            console.warn('⚠️ Security Alert - Subscriber:', req.user.id, { isRooted, isVPNActive, ip: clientIP });
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

/**
 * Get subscriber profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.user.id)
            .populate('primaryPackageId', 'name cost duration')
            .populate('packages', 'name')
            .select('subscriberName macAddress status expiryDate lastLocation deviceInfo partnerCode');

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
                deviceInfo: subscriber.deviceInfo,
                partnerCode: subscriber.partnerCode
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