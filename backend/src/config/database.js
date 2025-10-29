// backend/src/config/database.js
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Seed admin user after successful connection
        await seedAdminUser();

    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

const seedAdminUser = async () => {
    try {
        // Import User model here to avoid circular dependency
        const { default: User } = await import('../models/User.js');

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            email: process.env.ADMIN_EMAIL || 'admin@admin.com',
            role: 'admin'
        });

        if (!existingAdmin) {
            const adminUser = new User({
                name: process.env.ADMIN_NAME || 'System Administrator',
                email: process.env.ADMIN_EMAIL || 'admin@admin.com',
                password: process.env.ADMIN_PASSWORD || 'admin123',
                phone: process.env.ADMIN_PHONE || '+1234567890',
                role: 'admin',
                balance: 0,
                status: 'Active',
                lastLogin: new Date()
            });

            await adminUser.save();
            console.log('\n╔═══════════════════════════════════════════════════╗');
            console.log('║     ADMIN USER SEEDED SUCCESSFULLY!              ║');
            console.log('╠═══════════════════════════════════════════════════╣');
            console.log('║  Email:   ', (process.env.ADMIN_EMAIL || 'admin@admin.com').padEnd(32), '║');
            console.log('║  Password:', (process.env.ADMIN_PASSWORD || 'admin123').padEnd(32), '║');
            console.log('║  Phone:   ', (process.env.ADMIN_PHONE || '+1234567890').padEnd(32), '║');
            console.log('╠═══════════════════════════════════════════════════╣');
            console.log('║  ⚠️  IMPORTANT: Change password after first login! ║');
            console.log('╚═══════════════════════════════════════════════════╝\n');
        } else {
            console.log('✓ Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error seeding admin user:', error.message);
    }
};

export default connectDB;
