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

        // Find or create subscriber
        let subscriber = await Subscriber.findOne({ macAddress: macAddress.trim() });

        if (!subscriber) {
            // Create new subscriber
            const defaultPackage = reseller.packages && reseller.packages.length > 0
                ? reseller.packages[0]
                : null;

            if (!defaultPackage) {
                return res.status(400).json({
                    success: false,
                    message: 'No package available'
                });
            }

            subscriber = new Subscriber({
                resellerId: reseller._id,
                subscriberName: deviceName || 'User',
                serialNumber: macAddress.trim(),
                macAddress: macAddress.trim(),
                package: defaultPackage._id,
                status: 'Active',
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await subscriber.save();
        }

        // Check expiry
        if (new Date() > new Date(subscriber.expiryDate)) {
            return res.status(403).json({
                success: false,
                message: 'Subscription expired. Contact your reseller.'
            });
        }

        // Get channels from package
        await subscriber.populate({
            path: 'package',
            populate: {
                path: 'channels',
                populate: [
                    { path: 'language', select: 'name' },
                    { path: 'genre', select: 'name' }
                ]
            }
        });

        const channels = subscriber.package?.channels || [];

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
                    packageName: subscriber.package?.name
                },
                channels,
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
