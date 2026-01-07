import express from 'express';
import User from '../models/User.js';
import Subscriber from '../models/Subscriber.js';
import Ott from '../models/Ott.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Remove expired packages from subscriber
 * Returns: { hadChanges: boolean, subscriber: updatedSubscriber }
 */
const removeExpiredPackages = async (subscriber) => {
    const now = new Date();
    let hadChanges = false;

    // If no packages, return early
    if (!subscriber.packages || subscriber.packages.length === 0) {
        return { hadChanges: false, subscriber };
    }

    // Populate packages to get duration info
    await subscriber.populate('packages', 'duration');

    // Filter packages based on their expiry
    const validPackages = [];
    const expiredPackageNames = [];

    for (const pkg of subscriber.packages) {
        // Calculate when this package expires
        const assignedDate = subscriber.createdAt || now;
        const packageDuration = pkg.duration || 30; // Default 30 days
        const packageExpiry = new Date(assignedDate.getTime() + packageDuration * 24 * 60 * 60 * 1000);

        // Check if package has expired
        if (now > packageExpiry) {
            expiredPackageNames.push(pkg.name || pkg._id);
            hadChanges = true;
        } else {
            validPackages.push(pkg._id);
        }
    }

    // Update packages array if any were removed
    if (hadChanges) {
        subscriber.packages = validPackages;

        console.log(`🗑️  Removed ${expiredPackageNames.length} expired package(s) from subscriber ${subscriber.subscriberName}:`, expiredPackageNames);

        // If no packages left, set to Inactive
        if (validPackages.length === 0) {
            subscriber.status = 'Inactive';
            console.log(`Subscriber ${subscriber.subscriberName} set to Inactive - no packages remaining`);
        }

        // Update primaryPackageId if it was removed
        if (subscriber.primaryPackageId) {
            const primaryExists = validPackages.some(pkgId =>
                pkgId.toString() === subscriber.primaryPackageId.toString()
            );

            if (!primaryExists) {
                subscriber.primaryPackageId = validPackages.length > 0 ? validPackages[0] : null;
                console.log(`🔄 Updated primaryPackageId for subscriber ${subscriber.subscriberName}`);
            }
        }

        await subscriber.save();
    }

    return { hadChanges, subscriber };
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
// PUBLIC ROUTES
// ==========================================

// LOGIN ROUTE WITH CUSTOM MAC SUPPORT + PARTNER CODE SWITCHING
router.post('/login', async (req, res) => {
    try {
        const { partnerCode, macAddress, deviceName, customMac } = req.body;

        if (!partnerCode || !macAddress) {
            return res.status(400).json({
                success: false,
                message: 'Partner code and device MAC address required'
            });
        }

        // ✅ UPDATED: Fetch validityDate for distributor check
        const reseller = await User.findOne({
            partnerCode: partnerCode.trim(),
            role: 'reseller'
        })
            .populate('packages')
            .populate('createdBy', 'status name validityDate'); // ✅ Added validityDate

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Invalid partner code'
            });
        }

        // ✅ UPDATED: Check reseller status and validity
        if (reseller.status !== 'Active') {
            return res.status(403).json({
                success: false,
                code: 'RESELLER_INACTIVE',
                message: `Your reseller account is inactive. Please contact your reseller or admin to reactivate the account.`
            });
        }

        // ✅ NEW: Check reseller validity date
        if (reseller.validityDate && new Date() > reseller.validityDate) {
            return res.status(403).json({
                success: false,
                code: 'RESELLER_EXPIRED',
                message: `Your reseller's validity has expired. Please contact admin.`
            });
        }

        // ✅ UPDATED: Check distributor status and validity (if reseller has a distributor)
        if (reseller.createdBy) {
            if (reseller.createdBy.status !== 'Active') {
                return res.status(403).json({
                    success: false,
                    code: 'DISTRIBUTOR_INACTIVE',
                    message: `The distributor account (${reseller.createdBy.name}) for your reseller is inactive. Please contact admin.`
                });
            }

            // ✅ NEW: Check distributor validity date
            if (reseller.createdBy.validityDate && new Date() > reseller.createdBy.validityDate) {
                return res.status(403).json({
                    success: false,
                    code: 'DISTRIBUTOR_EXPIRED',
                    message: `The distributor's validity has expired. Please contact admin.`
                });
            }
        }

        const deviceMac = macAddress.trim().toLowerCase();
        let subscriber;
        let usingCustomMac = false;

        // ==========================================
        // CASE 1: Custom MAC Provided
        // ==========================================
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
                    message: `Custom MAC not found or not active.\n\nEntered MAC: ${customMac}\n\nPlease ensure:\n• MAC address is correct\n• The account is Active`,
                });
            }

            // ✅ CHECK AND REMOVE EXPIRED PACKAGES
            const { hadChanges } = await removeExpiredPackages(activeSubscriber);

            if (hadChanges) {
                console.log(`✅ Cleaned expired packages from custom MAC: ${customMacAddress}`);
            }

            // Check if packages still exist after cleanup
            if (activeSubscriber.packages.length === 0) {
                return res.status(403).json({
                    success: false,
                    code: 'CUSTOM_MAC_NO_PACKAGES',
                    message: `Custom MAC has no active packages.\n\nMAC: ${customMac}\n\nAll packages have expired. Please contact admin to renew.`,
                });
            }

            if (new Date() > new Date(activeSubscriber.expiryDate)) {
                return res.status(403).json({
                    success: false,
                    code: 'CUSTOM_MAC_EXPIRED',
                    message: `Custom MAC subscription expired.\n\nMAC: ${customMac}\nExpired on: ${new Date(activeSubscriber.expiryDate).toLocaleDateString()}\n\nPlease use another active MAC or contact admin.`,
                });
            }

            subscriber = await Subscriber.findOne({
                resellerId: reseller._id,
                serialNumber: deviceMac
            });

            if (!subscriber) {
                subscriber = new Subscriber({
                    resellerId: reseller._id,
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
            subscriber.deviceInfo = {
                ...subscriber.deviceInfo,
                lastIPAddress: req.ip || req.connection.remoteAddress,
                deviceModel: deviceName || subscriber.deviceInfo?.deviceModel,
            };
            await subscriber.save();

            subscriber = activeSubscriber;
            usingCustomMac = true;

            console.log(`✅ Login with custom MAC: ${customMacAddress} from device: ${deviceMac}`);

            // ==========================================
            // CASE 2: No Custom MAC - Use Own Device MAC
            // ==========================================
        } else {
            // 🔥 STEP 1: First check if MAC exists ANYWHERE (any reseller)
            const existingSubscriber = await Subscriber.findOne({
                serialNumber: deviceMac
            });

            // 🔥 STEP 2A: MAC exists but under DIFFERENT reseller
            if (existingSubscriber && existingSubscriber.resellerId.toString() !== reseller._id.toString()) {
                console.log(`🔄 MAC ${deviceMac} switching from reseller ${existingSubscriber.resellerId} to ${reseller._id}`);

                // Update the subscriber to new reseller
                existingSubscriber.resellerId = reseller._id;

                // Reset to Fresh status for new reseller
                existingSubscriber.status = 'Fresh';
                existingSubscriber.packages = [];
                existingSubscriber.primaryPackageId = null;
                existingSubscriber.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                await existingSubscriber.save();

                console.log(`✅ MAC ${deviceMac} moved to new partner code ${partnerCode}`);

                return res.status(201).json({
                    success: false,
                    code: 'MAC_SWITCHED_PARTNER',
                    message: `Device switched to new partner code successfully!\n\nYour device is now registered as Fresh under partner code: ${partnerCode}\n\nPlease contact your new reseller/admin to assign packages and activate your account.`,
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

            // 🔥 STEP 2B: MAC exists under SAME reseller
            if (existingSubscriber && existingSubscriber.resellerId.toString() === reseller._id.toString()) {
                subscriber = existingSubscriber;

                // ✅ CHECK AND REMOVE EXPIRED PACKAGES FOR EXISTING SUBSCRIBER
                const { hadChanges } = await removeExpiredPackages(subscriber);

                if (hadChanges) {
                    console.log(`✅ Cleaned expired packages from device MAC: ${deviceMac}`);
                }

                // Auto-activate if packages are assigned to Fresh subscriber
                if (subscriber.status === 'Fresh' && subscriber.packages && subscriber.packages.length > 0) {
                    subscriber.status = 'Active';
                    await subscriber.save();
                    console.log(`✅ Auto-activated Fresh subscriber with packages: ${deviceMac}`);
                }

                // SUB-CASE B: Device MAC found but is Fresh without packages
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

                // SUB-CASE C: Device MAC found but is Inactive
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

                // SUB-CASE D: Device MAC Active but Expired
                if (new Date() > new Date(subscriber.expiryDate)) {
                    return res.status(403).json({
                        success: false,
                        code: 'MAC_EXPIRED',
                        message: `Your subscription has expired.\n\nExpiry Date: ${new Date(subscriber.expiryDate).toLocaleDateString()}\n\nPlease contact admin/reseller to renew or use a Custom MAC.`,
                        data: {
                            deviceMac: deviceMac,
                            expiryDate: subscriber.expiryDate,
                            status: subscriber.status,
                            canUseCustomMac: true,
                            hasPackages: subscriber.packages?.length > 0
                        }
                    });
                }
            }

            // 🔥 STEP 2C: MAC doesn't exist - Create new Fresh subscriber
            if (!existingSubscriber) {
                subscriber = new Subscriber({
                    resellerId: reseller._id,
                    subscriberName: deviceName || 'User',
                    serialNumber: deviceMac,
                    macAddress: deviceMac,
                    status: 'Fresh',
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    packages: [],
                    deviceInfo: {
                        lastIPAddress: req.ip || req.connection.remoteAddress,
                        deviceModel: deviceName || ''
                    }
                });

                await subscriber.save();
                console.log(`✅ Created new Fresh subscriber: ${deviceMac}`);

                return res.status(201).json({
                    success: false,
                    code: 'MAC_FRESH_NEW',
                    message: 'Welcome! Your device has been registered.\n\nPlease contact admin/reseller to assign packages and activate your account.',
                    data: {
                        deviceMac: deviceMac,
                        status: 'Fresh',
                        partnerCode: partnerCode,
                        canUseCustomMac: true,
                        hasPackages: false
                    }
                });
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: subscriber._id,
                macAddress: subscriber.macAddress,
                resellerId: subscriber.resellerId
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Populate for response
        await subscriber.populate('packages', 'name cost duration');
        await subscriber.populate('primaryPackageId', 'name cost duration');

        res.json({
            success: true,
            message: usingCustomMac ? 'Login successful with custom MAC' : 'Login successful',
            data: {
                subscriber: {
                    _id: subscriber._id,
                    subscriberName: subscriber.subscriberName,
                    serialNumber: subscriber.serialNumber,
                    macAddress: subscriber.macAddress,
                    status: subscriber.status,
                    expiryDate: subscriber.expiryDate,
                    packages: subscriber.packages,
                    primaryPackage: subscriber.primaryPackageId
                },
                token,
                usingCustomMac
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

// Get channels by package
router.get('/channels', authenticateToken, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.user.id)
            .populate({
                path: 'packages',
                populate: {
                    path: 'channels',
                    select: 'name lcn imageUrl url genre language'
                }
            });

        if (!subscriber || !subscriber.packages || subscriber.packages.length === 0) {
            return res.json({
                success: true,
                data: { channels: [] }
            });
        }

        const channelMap = new Map();
        subscriber.packages.forEach(pkg => {
            if (pkg.channels) {
                pkg.channels.forEach(channel => {
                    if (!channelMap.has(channel._id.toString())) {
                        channelMap.set(channel._id.toString(), {
                            ...channel.toObject(),
                            packageNames: [pkg.name]
                        });
                    } else {
                        const existing = channelMap.get(channel._id.toString());
                        existing.packageNames.push(pkg.name);
                    }
                });
            }
        });

        const channels = buildChannelResponse(channelMap);

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

export default router;