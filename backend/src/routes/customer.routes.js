// backend/src/routes/customer.js
import express from 'express';
import User from '../models/User.js';
import Subscriber from '../models/Subscriber.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

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

        // FIXED: Create channels map with package information
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
                                packageNames: [pkg.name] // FIXED: Add package tracking
                            });
                        }
                    }
                });
            }
        });

        const channels = Array.from(channelMap.values());

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
                channels, // Now includes packageNames
                packagesList, // FIXED: Add complete package list
                token
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

export default router;
