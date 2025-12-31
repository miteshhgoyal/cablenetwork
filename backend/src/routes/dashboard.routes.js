// ==========================================
// BACKEND: dashboard.js (Complete File)
// ==========================================

import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Channel from '../models/Channel.js';
import Package from '../models/Package.js';
import Subscriber from '../models/Subscriber.js';
import Ott from '../models/Ott.js';
import Credit from '../models/Credit.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';

const router = express.Router();

router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let dashboardData = {
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                balance: user.balance,
                status: user.status,
                partnerCode: user.partnerCode,
                createdAt: user.createdAt
            },
            stats: {},
            creditStats: null
        };

        // Date calculations for time-based metrics
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // CREDIT ANALYTICS
        let creditQuery = {};

        if (user.role === 'admin') {
            creditQuery = {};
        } else if (user.role === 'distributor') {
            const resellers = await User.find({
                role: 'reseller',
                createdBy: userId
            }).select('_id');
            const resellerIds = resellers.map(r => r._id);

            creditQuery = {
                $or: [
                    { senderUser: userId },
                    { targetUser: userId },
                    { senderUser: { $in: resellerIds } },
                    { targetUser: { $in: resellerIds } }
                ]
            };
        } else if (user.role === 'reseller') {
            creditQuery = {
                $or: [
                    { senderUser: userId },
                    { targetUser: userId }
                ]
            };
        }

        const credits = await Credit.find(creditQuery)
            .populate('senderUser', 'name')
            .populate('targetUser', 'name')
            .sort({ createdAt: -1 });

        let totalCreditsGiven = 0;
        let totalCreditsCount = 0;
        let totalDebitsTaken = 0;
        let totalDebitsCount = 0;
        let totalReverseCredits = 0;
        let totalReverseCreditsCount = 0;

        credits.forEach(credit => {
            if (credit.senderUser?._id.toString() === userId.toString()) {
                if (credit.type === 'Credit') {
                    totalCreditsGiven += credit.amount;
                    totalCreditsCount++;
                } else if (credit.type === 'Debit') {
                    totalDebitsTaken += credit.amount;
                    totalDebitsCount++;
                } else if (credit.type === 'Reverse Credit') {
                    totalReverseCredits += credit.amount;
                    totalReverseCreditsCount++;
                }
            }
        });

        const netBalanceFlow = totalCreditsGiven - (totalDebitsTaken + totalReverseCredits);
        const recentTransactions = credits
            .filter(c => c.senderUser?._id.toString() === userId.toString())
            .slice(0, 5);

        dashboardData.creditStats = {
            totalCreditsGiven,
            totalCreditsCount,
            totalDebitsTaken,
            totalDebitsCount,
            totalReverseCredits,
            totalReverseCreditsCount,
            netBalanceFlow,
            recentTransactions
        };

        // ROLE-BASED STATS CALCULATION
        switch (user.role) {
            case 'admin': {
                const [
                    totalCategories,
                    totalChannels,
                    totalPackages,
                    totalOtt,
                    totalSubscribers,
                    totalDistributors,
                    totalResellers,
                    activeSubscribers,
                    inactiveSubscribers,
                    freshSubscribers,
                    expiringSoon,
                    activeDistributors,
                    activeResellers
                ] = await Promise.all([
                    Category.countDocuments(),
                    Channel.countDocuments(),
                    Package.countDocuments(),
                    Ott.countDocuments(),
                    Subscriber.countDocuments(),
                    User.countDocuments({ role: 'distributor' }),
                    User.countDocuments({ role: 'reseller' }),
                    Subscriber.countDocuments({ status: 'Active' }),
                    Subscriber.countDocuments({ status: 'Inactive' }),
                    Subscriber.countDocuments({
                        status: 'Fresh',
                        createdAt: { $gte: sevenDaysAgo }
                    }),
                    Subscriber.countDocuments({
                        endDate: {
                            $gte: now,
                            $lte: sevenDaysLater
                        },
                        status: 'Active'
                    }),
                    User.countDocuments({
                        role: 'distributor',
                        status: 'Active'
                    }),
                    User.countDocuments({
                        role: 'reseller',
                        status: 'Active'
                    })
                ]);

                dashboardData.stats = {
                    totalCategories,
                    totalChannels,
                    totalPackages,
                    totalOtt,
                    totalSubscribers,
                    totalDistributors,
                    totalResellers,
                    activeSubscribers,
                    inactiveSubscribers,
                    freshSubscribers,
                    expiringSoon,
                    activeDistributors,
                    activeResellers
                };
                break;
            }

            case 'distributor': {
                const distributorResellers = await User.find({
                    role: 'reseller',
                    createdBy: userId
                });

                const resellerIds = distributorResellers.map(r => r._id);
                const activeResellerIds = distributorResellers
                    .filter(r => r.status === 'Active')
                    .map(r => r._id);

                const [
                    distributorCategories,
                    distributorChannels,
                    distributorPackages,
                    distributorOtt,
                    distributorSubscribers,
                    distributorActiveSubscribers,
                    freshSubscribers,
                    expiringSoon
                ] = await Promise.all([
                    Category.countDocuments(),
                    Channel.countDocuments(),
                    Package.countDocuments(),
                    Ott.countDocuments(),
                    Subscriber.countDocuments({
                        resellerId: { $in: resellerIds }
                    }),
                    Subscriber.countDocuments({
                        resellerId: { $in: resellerIds },
                        status: 'Active'
                    }),
                    Subscriber.countDocuments({
                        resellerId: { $in: resellerIds },
                        status: 'Fresh',
                        createdAt: { $gte: sevenDaysAgo }
                    }),
                    Subscriber.countDocuments({
                        resellerId: { $in: resellerIds },
                        endDate: {
                            $gte: now,
                            $lte: sevenDaysLater
                        },
                        status: 'Active'
                    })
                ]);

                dashboardData.stats = {
                    totalResellers: distributorResellers.length,
                    activeResellers: activeResellerIds.length,
                    totalCategories: distributorCategories,
                    totalChannels: distributorChannels,
                    totalPackages: distributorPackages,
                    totalOtt: distributorOtt,
                    totalSubscribers: distributorSubscribers,
                    activeSubscribers: distributorActiveSubscribers,
                    inactiveSubscribers: distributorSubscribers - distributorActiveSubscribers,
                    freshSubscribers,
                    expiringSoon
                };
                break;
            }

            case 'reseller': {
                const [
                    resellerSubscribers,
                    resellerActiveSubscribers,
                    resellerInactiveSubscribers,
                    resellerFreshSubscribers,
                    recentlyAdded,
                    expiringSoon
                ] = await Promise.all([
                    Subscriber.countDocuments({ resellerId: userId }),
                    Subscriber.countDocuments({ resellerId: userId, status: 'Active' }),
                    Subscriber.countDocuments({ resellerId: userId, status: 'Inactive' }),
                    Subscriber.countDocuments({ resellerId: userId, status: 'Fresh' }),
                    Subscriber.countDocuments({
                        resellerId: userId,
                        createdAt: { $gte: sevenDaysAgo }
                    }),
                    Subscriber.countDocuments({
                        resellerId: userId,
                        endDate: {
                            $gte: now,
                            $lte: sevenDaysLater
                        },
                        status: 'Active'
                    })
                ]);

                dashboardData.stats = {
                    totalSubscribers: resellerSubscribers,
                    activeSubscribers: resellerActiveSubscribers,
                    inactiveSubscribers: resellerInactiveSubscribers,
                    freshSubscribers: resellerFreshSubscribers,
                    recentlyAdded,
                    expiringSoon,
                    totalPackages: user.packages?.length || 0,
                    subscriberLimit: user.subscriberLimit || 0,
                    availableSlots: (user.subscriberLimit || 0) - resellerSubscribers
                };
                break;
            }

            default:
                return res.status(403).json({
                    success: false,
                    message: 'Invalid user role'
                });
        }

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
});

router.get('/activities', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        let activities = [];

        if (user.role === 'admin') {
            activities = await Credit.find()
                .populate('senderUser', 'name email')
                .populate('targetUser', 'name email')
                .sort({ createdAt: -1 })
                .limit(10);
        } else {
            activities = await Credit.find({
                $or: [
                    { senderUser: userId },
                    { targetUser: userId }
                ]
            })
                .populate('senderUser', 'name email')
                .populate('targetUser', 'name email')
                .sort({ createdAt: -1 })
                .limit(10);
        }

        res.json({
            success: true,
            data: { activities }
        });

    } catch (error) {
        console.error('Dashboard activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
});

router.get('/backup', authenticateToken, async (req, res) => {
    let backupDir = null;
    let zipFilePath = null;

    try {
        console.log('[BACKUP] Route hit');
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            console.log(`[BACKUP] User not found for ID: ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (String(user.role).trim().toLowerCase() !== 'admin') {
            console.log(`[BACKUP] Permission denied for user ${userId}, role: ${user.role}`);
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        console.log('[BACKUP] Fetching all collections...');

        const [
            users,
            categories,
            channels,
            packages,
            subscribers,
            otts,
            credits
        ] = await Promise.all([
            User.find().lean(),
            Category.find().lean(),
            Channel.find().lean(),
            Package.find().lean(),
            Subscriber.find().lean(),
            Ott.find().lean(),
            Credit.find().lean()
        ]);

        console.log('[BACKUP] Data fetched successfully');
        console.log(`[BACKUP] Collections: Users=${users.length}, Categories=${categories.length}, Channels=${channels.length}, Packages=${packages.length}, Subscribers=${subscribers.length}, OTTs=${otts.length}, Credits=${credits.length}`);

        const timestamp = Date.now();
        const tmpDir = os.tmpdir();
        backupDir = path.join(tmpDir, `iptv_backup_${timestamp}`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`[BACKUP] Using temp directory: ${backupDir}`);
        console.log('[BACKUP] Writing JSON files...');

        const collections = {
            users,
            categories,
            channels,
            packages,
            subscribers,
            otts,
            credits
        };

        for (const [collectionName, data] of Object.entries(collections)) {
            const filePath = path.join(backupDir, `${collectionName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`[BACKUP] ✓ ${collectionName}.json (${data.length} records)`);
        }

        const metadata = {
            backupDate: new Date().toISOString(),
            backupBy: user.name,
            backupByEmail: user.email,
            databaseName: 'iptv',
            totalRecords: {
                users: users.length,
                categories: categories.length,
                channels: channels.length,
                packages: packages.length,
                subscribers: subscribers.length,
                otts: otts.length,
                credits: credits.length
            },
            version: '1.0.0'
        };

        fs.writeFileSync(
            path.join(backupDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2),
            'utf-8'
        );
        console.log('[BACKUP] ✓ metadata.json');

        console.log('[BACKUP] Creating ZIP archive...');

        zipFilePath = path.join(tmpDir, `iptv_backup_${timestamp}.zip`);
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            console.log(`[BACKUP] ✓ ZIP created: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="iptv_backup_${timestamp}.zip"`);

            const fileStream = fs.createReadStream(zipFilePath);

            fileStream.on('end', () => {
                console.log('[BACKUP] ✓ File sent successfully');
                cleanupBackupFiles(backupDir, zipFilePath);
            });

            fileStream.on('error', (streamErr) => {
                console.error('[BACKUP] Stream error:', streamErr);
                cleanupBackupFiles(backupDir, zipFilePath);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to stream backup file'
                    });
                }
            });

            fileStream.pipe(res);
        });

        archive.on('warning', (warn) => {
            console.warn('[BACKUP] Archive warning:', warn);
        });

        archive.on('error', (archiveErr) => {
            console.error('[BACKUP] Archive error:', archiveErr);
            cleanupBackupFiles(backupDir, zipFilePath);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to create backup archive'
                });
            }
        });

        archive.pipe(output);
        archive.directory(backupDir, false);
        await archive.finalize();

    } catch (error) {
        console.error('[BACKUP] Backup export error:', error);
        cleanupBackupFiles(backupDir, zipFilePath);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to export backup: ' + error.message
            });
        }
    }
});

function cleanupBackupFiles(backupDir, zipFilePath) {
    setTimeout(() => {
        try {
            if (backupDir && fs.existsSync(backupDir)) {
                fs.rmSync(backupDir, { recursive: true, force: true });
                console.log('[BACKUP] ✓ Backup directory cleaned');
            }
            if (zipFilePath && fs.existsSync(zipFilePath)) {
                fs.unlinkSync(zipFilePath);
                console.log('[BACKUP] ✓ ZIP file cleaned');
            }
        } catch (cleanupErr) {
            console.error('[BACKUP] Cleanup error:', cleanupErr);
        }
    }, 2000);
}

export default router;
