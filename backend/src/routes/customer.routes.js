// backend/src/routes/customer.js
import express from 'express';
import User from '../models/User.js';
import Subscriber from '../models/Subscriber.js';
import Package from '../models/Package.js';
import Channel from '../models/Channel.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Customer Registration (No Auth Required)
router.post('/register', async (req, res) => {
    try {
        const { partnerCode, subscriberName, serialNumber, macAddress } = req.body;

        // Validation
        if (!partnerCode || !subscriberName || !serialNumber || !macAddress) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Find reseller by partner code
        const reseller = await User.findOne({
            partnerCode: partnerCode.trim(),
            role: 'reseller',
            status: 'Active'
        });

        if (!reseller) {
            return res.status(404).json({
                success: false,
                message: 'Invalid partner code'
            });
        }

        // Check if subscriber already exists
        const existingSubscriber = await Subscriber.findOne({
            $or: [
                { serialNumber: serialNumber.trim() },
                { macAddress: macAddress.trim() }
            ]
        });

        if (existingSubscriber) {
            return res.status(400).json({
                success: false,
                message: 'Device already registered'
            });
        }

        // Check subscriber limit
        const currentSubscribers = await Subscriber.countDocuments({
            resellerId: reseller._id
        });

        if (reseller.subscriberLimit && currentSubscribers >= reseller.subscriberLimit) {
            return res.status(400).json({
                success: false,
                message: 'Reseller has reached subscriber limit'
            });
        }

        // Get default package (first package)
        const defaultPackage = reseller.packages && reseller.packages.length > 0
            ? reseller.packages[0]
            : null;

        if (!defaultPackage) {
            return res.status(400).json({
                success: false,
                message: 'No package available for this reseller'
            });
        }

        // Create subscriber
        const subscriber = new Subscriber({
            resellerId: reseller._id,
            subscriberName: subscriberName.trim(),
            serialNumber: serialNumber.trim(),
            macAddress: macAddress.trim(),
            package: defaultPackage,
            status: 'Active',
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });

        await subscriber.save();

        // Populate package details
        await subscriber.populate('package');

        // Generate token
        const token = jwt.sign(
            {
                id: subscriber._id,
                type: 'subscriber',
                resellerId: reseller._id
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                subscriber,
                token,
                expiryDate: subscriber.expiryDate
            }
        });

    } catch (error) {
        console.error('Customer registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// Customer Login (with MAC address)
router.post('/login', async (req, res) => {
    try {
        const { macAddress } = req.body;

        if (!macAddress) {
            return res.status(400).json({
                success: false,
                message: 'MAC address is required'
            });
        }

        const subscriber = await Subscriber.findOne({
            macAddress: macAddress.trim(),
            status: 'Active'
        }).populate('package');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Device not registered or inactive'
            });
        }

        // Check expiry
        if (new Date() > new Date(subscriber.expiryDate)) {
            return res.status(403).json({
                success: false,
                message: 'Subscription expired'
            });
        }

        // Generate token
        const token = jwt.sign(
            {
                id: subscriber._id,
                type: 'subscriber',
                resellerId: subscriber.resellerId
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            data: {
                subscriber,
                token,
                expiryDate: subscriber.expiryDate
            }
        });

    } catch (error) {
        console.error('Customer login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Get Available Channels (Based on Package)
router.get('/channels', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        const subscriber = await Subscriber.findById(decoded.id)
            .populate({
                path: 'package',
                populate: {
                    path: 'channels',
                    populate: [
                        { path: 'language', select: 'name' },
                        { path: 'genre', select: 'name' }
                    ]
                }
            });

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

        const channels = subscriber.package?.channels || [];

        res.json({
            success: true,
            data: {
                channels,
                packageName: subscriber.package?.name,
                expiryDate: subscriber.expiryDate
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

// Get Subscriber Profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        const subscriber = await Subscriber.findById(decoded.id)
            .populate('package', 'name cost duration')
            .populate('resellerId', 'name phone');

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        res.json({
            success: true,
            data: { subscriber }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

export default router;
