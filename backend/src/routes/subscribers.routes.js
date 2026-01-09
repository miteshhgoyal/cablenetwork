import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Subscriber from '../models/Subscriber.js';
import User from '../models/User.js';
import Package from '../models/Package.js';

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkSubscriberPermission(userId, subscriber) {
    const user = await User.findById(userId);
    if (user.role === 'admin') return true;
    if (user.role === 'reseller') {
        return subscriber.partnerCode && subscriber.partnerCode === user.partnerCode;
    }
    if (user.role === 'distributor') {
        if (!subscriber.partnerCode) return false;
        const reseller = await User.findOne({
            partnerCode: subscriber.partnerCode,
            role: 'reseller',
            createdBy: userId
        });
        return reseller !== null;
    }
    return false;
}

// FIXED: Round to nearest 10 for cleaner pricing
function roundToNearest10(amount) {
    return Math.round(amount / 10) * 10;
}

// ============================================================================
// PACKAGE EXTENSION CALCULATION
// ============================================================================

async function calculatePackageExtensionCharge(partnerCode, packageId, days, skipBalanceCheck = false) {
    let totalCharges = 0;

    if (skipBalanceCheck) {
        return { success: true, chargedAmount: 0, remainingBalance: null, message: 'Admin operation - no charges' };
    }

    const reseller = await User.findOne({ partnerCode, role: 'reseller' });
    if (!reseller) {
        return { success: false, error: 'Reseller not found for partner code' };
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) {
        return { success: false, error: 'Package not found' };
    }

    // Calculate charge
    const dailyRate = pkg.costPerDay || 0;
    const extensionCost = dailyRate * days;

    // FIXED: Round to nearest 10
    totalCharges = roundToNearest10(extensionCost);

    console.log(`📦 Extension for ${pkg.name}: ₹${dailyRate} × ${days} days = ₹${extensionCost} → Rounded: ₹${totalCharges}`);

    if (totalCharges === 0) {
        return { success: true, chargedAmount: 0, remainingBalance: reseller.balance, message: 'No charges required' };
    }

    if (reseller.balance < totalCharges) {
        return {
            success: false,
            error: `Insufficient balance. Required: ₹${totalCharges}, Available: ₹${reseller.balance.toFixed(2)}`,
            requiredAmount: totalCharges,
            availableBalance: reseller.balance
        };
    }

    const updatedReseller = await User.findOneAndUpdate(
        { _id: reseller._id, balance: { $gte: totalCharges } },
        { $inc: { balance: -totalCharges } },
        { new: true }
    );

    if (!updatedReseller) {
        return { success: false, error: 'Failed to deduct balance. Please try again.' };
    }

    return {
        success: true,
        chargedAmount: totalCharges,
        remainingBalance: updatedReseller.balance,
        message: `₹${totalCharges} deducted successfully`
    };
}

// ============================================================================
// ROUTES
// ============================================================================

// GET all subscribers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { status, search } = req.query;

        let query = {};

        if (currentUser.role === 'admin') {
            // Admin sees all
        } else if (currentUser.role === 'distributor') {
            const resellers = await User.find({ role: 'reseller', createdBy: userId }).select('partnerCode');
            const partnerCodes = resellers.map(r => r.partnerCode).filter(pc => pc);
            query.partnerCode = { $in: partnerCodes };
        } else if (currentUser.role === 'reseller') {
            query.partnerCode = currentUser.partnerCode;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { subscriberName: { $regex: search, $options: 'i' } },
                { macAddress: { $regex: search, $options: 'i' } },
                { serialNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const subscribers = await Subscriber.find(query)
            .populate('packages.packageId', 'name cost duration costPerDay')
            .sort({ createdAt: -1 });

        const subscribersWithReseller = await Promise.all(
            subscribers.map(async (sub) => {
                const subObj = sub.toObject();
                if (sub.partnerCode) {
                    const reseller = await User.findOne(
                        { partnerCode: sub.partnerCode, role: 'reseller' },
                        'name email balance partnerCode'
                    );
                    subObj.resellerInfo = reseller || null;
                } else {
                    subObj.resellerInfo = null;
                }
                return subObj;
            })
        );

        res.json({ success: true, data: { subscribers: subscribersWithReseller } });
    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch subscribers' });
    }
});

// GET resellers list
router.get('/resellers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        let resellers;
        if (user.role === 'admin') {
            resellers = await User.find({ role: 'reseller' }).select('name email partnerCode').sort({ name: 1 });
        } else if (user.role === 'distributor') {
            resellers = await User.find({ role: 'reseller', createdBy: userId }).select('name email partnerCode').sort({ name: 1 });
        }

        res.json({ success: true, data: { resellers } });
    } catch (error) {
        console.error('Get resellers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch resellers' });
    }
});

// GET packages list
router.get('/packages', authenticateToken, async (req, res) => {
    try {
        const packages = await Package.find().select('name cost duration costPerDay').sort({ name: 1 });
        res.json({ success: true, data: { packages } });
    } catch (error) {
        console.error('Get packages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch packages' });
    }
});

// GET single subscriber
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriber = await Subscriber.findById(req.params.id)
            .populate('packages.packageId', 'name cost duration costPerDay');

        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        res.json({ success: true, data: { subscriber: subObj } });
    } catch (error) {
        console.error('Get subscriber error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch subscriber' });
    }
});

// POST create new subscriber
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { subscriberName, macAddress, serialNumber, partnerCode } = req.body;

        if (!subscriberName || !macAddress || !serialNumber) {
            return res.status(400).json({ success: false, message: 'Name, MAC address, and serial number are required' });
        }

        const existingSubscriber = await Subscriber.findOne({ macAddress: macAddress.trim().toLowerCase() });
        if (existingSubscriber) {
            return res.status(400).json({ success: false, message: 'MAC address already exists' });
        }

        let finalResellerId = null;
        let finalPartnerCode = null;

        if (currentUser.role === 'admin') {
            if (partnerCode) {
                const reseller = await User.findOne({ partnerCode, role: 'reseller' });
                if (!reseller) {
                    return res.status(400).json({ success: false, message: 'Invalid partner code' });
                }
                finalResellerId = reseller._id;
                finalPartnerCode = partnerCode;
            }
        } else if (currentUser.role === 'distributor') {
            if (partnerCode) {
                const reseller = await User.findOne({ partnerCode, role: 'reseller', createdBy: userId });
                if (!reseller) {
                    return res.status(403).json({ success: false, message: 'Invalid partner code - not under your distributorship' });
                }
                finalResellerId = reseller._id;
                finalPartnerCode = partnerCode;
            }
        } else if (currentUser.role === 'reseller') {
            finalResellerId = userId;
            finalPartnerCode = currentUser.partnerCode;
        }

        const subscriber = new Subscriber({
            subscriberName: subscriberName.trim(),
            macAddress: macAddress.trim().toLowerCase(),
            serialNumber: serialNumber.trim(),
            status: 'Fresh',
            packages: [],
            resellerId: finalResellerId,
            partnerCode: finalPartnerCode
        });

        await subscriber.save();

        const subObj = subscriber.toObject();
        if (finalPartnerCode) {
            const reseller = await User.findOne(
                { partnerCode: finalPartnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        res.status(201).json({ success: true, message: 'Subscriber created successfully', data: { subscriber: subObj } });
    } catch (error) {
        console.error('Create subscriber error:', error);
        res.status(500).json({ success: false, message: 'Failed to create subscriber' });
    }
});

// PUT update subscriber (basic info only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { subscriberName, macAddress, serialNumber } = req.body;

        const subscriber = await Subscriber.findById(req.params.id);
        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!subscriberName || !macAddress || !serialNumber) {
            return res.status(400).json({ success: false, message: 'Name, MAC address, and serial number are required' });
        }

        const existingSubscriber = await Subscriber.findOne({
            macAddress: macAddress.trim().toLowerCase(),
            _id: { $ne: req.params.id }
        });

        if (existingSubscriber) {
            return res.status(400).json({ success: false, message: 'MAC address already exists' });
        }

        subscriber.subscriberName = subscriberName.trim();
        subscriber.macAddress = macAddress.trim().toLowerCase();
        subscriber.serialNumber = serialNumber.trim();

        await subscriber.save();
        await subscriber.populate('packages.packageId', 'name cost duration costPerDay');

        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        res.json({ success: true, message: 'Subscriber updated successfully', data: { subscriber: subObj } });
    } catch (error) {
        console.error('Update subscriber error:', error);
        res.status(500).json({ success: false, message: 'Failed to update subscriber' });
    }
});

// DELETE subscriber
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriber = await Subscriber.findById(req.params.id);

        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await subscriber.deleteOne();
        return res.json({ success: true, message: 'Subscriber deleted successfully' });
    } catch (error) {
        console.error('Delete subscriber error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete subscriber' });
    }
});

// POST add package to subscriber
router.post('/:id/packages/add', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { packageId, days } = req.body;

        if (!packageId || !days || days <= 0) {
            return res.status(400).json({ success: false, message: 'Package ID and valid days are required' });
        }

        const subscriber = await Subscriber.findById(req.params.id);
        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const pkg = await Package.findById(packageId);
        if (!pkg) {
            return res.status(400).json({ success: false, message: 'Invalid package' });
        }

        // Check if package already exists
        const existingPackage = subscriber.packages.find(p => p.packageId.toString() === packageId);
        if (existingPackage) {
            return res.status(400).json({ success: false, message: 'Package already assigned to subscriber' });
        }

        // Calculate charge and deduct balance
        let balanceResult = null;
        if (subscriber.partnerCode) {
            balanceResult = await calculatePackageExtensionCharge(
                subscriber.partnerCode,
                packageId,
                days,
                currentUser.role === 'admin'
            );

            if (!balanceResult.success) {
                return res.status(400).json({ success: false, message: balanceResult.error });
            }
        }

        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        expiryDate.setHours(23, 59, 59, 999);

        // Add package
        subscriber.packages.push({ packageId, expiryDate });

        // Update status to Active if there are packages
        if (subscriber.packages.length > 0 && subscriber.status === 'Fresh') {
            subscriber.status = 'Active';
        }

        await subscriber.save();
        await subscriber.populate('packages.packageId', 'name cost duration costPerDay');

        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        res.json({
            success: true,
            message: `Package added successfully. ${balanceResult?.message || ''}`,
            data: { subscriber: subObj },
            chargedAmount: balanceResult?.chargedAmount || 0,
            remainingBalance: balanceResult?.remainingBalance || null
        });
    } catch (error) {
        console.error('Add package error:', error);
        res.status(500).json({ success: false, message: 'Failed to add package' });
    }
});

// POST extend package expiry
router.post('/:id/packages/:packageId/extend', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);
        const { days } = req.body;

        if (!days || days <= 0) {
            return res.status(400).json({ success: false, message: 'Valid days are required' });
        }

        const subscriber = await Subscriber.findById(req.params.id);
        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const packageItem = subscriber.packages.find(p => p.packageId.toString() === req.params.packageId);
        if (!packageItem) {
            return res.status(404).json({ success: false, message: 'Package not found for this subscriber' });
        }

        // Calculate charge and deduct balance
        let balanceResult = null;
        if (subscriber.partnerCode) {
            balanceResult = await calculatePackageExtensionCharge(
                subscriber.partnerCode,
                req.params.packageId,
                days,
                currentUser.role === 'admin'
            );

            if (!balanceResult.success) {
                return res.status(400).json({ success: false, message: balanceResult.error });
            }
        }

        // Extend expiry date
        const currentExpiry = new Date(packageItem.expiryDate);
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;

        const newExpiryDate = new Date(baseDate);
        newExpiryDate.setDate(newExpiryDate.getDate() + days);
        newExpiryDate.setHours(23, 59, 59, 999);

        packageItem.expiryDate = newExpiryDate;

        await subscriber.save();
        await subscriber.populate('packages.packageId', 'name cost duration costPerDay');

        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        res.json({
            success: true,
            message: `Package extended successfully. ${balanceResult?.message || ''}`,
            data: { subscriber: subObj },
            chargedAmount: balanceResult?.chargedAmount || 0,
            remainingBalance: balanceResult?.remainingBalance || null
        });
    } catch (error) {
        console.error('Extend package error:', error);
        res.status(500).json({ success: false, message: 'Failed to extend package' });
    }
});

// DELETE remove package from subscriber
router.delete('/:id/packages/:packageId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriber = await Subscriber.findById(req.params.id);

        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        const hasPermission = await checkSubscriberPermission(userId, subscriber);
        if (!hasPermission) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const packageIndex = subscriber.packages.findIndex(p => p.packageId.toString() === req.params.packageId);
        if (packageIndex === -1) {
            return res.status(404).json({ success: false, message: 'Package not found for this subscriber' });
        }

        subscriber.packages.splice(packageIndex, 1);

        // Update status if no packages left
        if (subscriber.packages.length === 0) {
            subscriber.status = 'Fresh';
        }

        await subscriber.save();
        await subscriber.populate('packages.packageId', 'name cost duration costPerDay');

        const subObj = subscriber.toObject();
        if (subscriber.partnerCode) {
            const reseller = await User.findOne(
                { partnerCode: subscriber.partnerCode, role: 'reseller' },
                'name email balance partnerCode'
            );
            subObj.resellerInfo = reseller || null;
        } else {
            subObj.resellerInfo = null;
        }

        res.json({ success: true, message: 'Package removed successfully', data: { subscriber: subObj } });
    } catch (error) {
        console.error('Remove package error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove package' });
    }
});

export default router;
