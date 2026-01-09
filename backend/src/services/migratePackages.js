// scripts/migrate-cost-per-day.js
import mongoose from 'mongoose';

// Import Package model
import Package from '../models/Package.js';

const connectDB = async () => {
    try {
        const mongoURI = 'mongodb://localhost:27017/cable-network';

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ MongoDB connected successfully');
        console.log(`📍 Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const migrate = async () => {
    try {
        console.log('🚀 Starting migration: Adding costPerDay to packages...\n');

        // Connect to database
        await connectDB();

        // Find all packages that don't have costPerDay field
        const packages = await Package.find({ costPerDay: { $exists: false } });

        console.log(`📦 Found ${packages.length} packages to update\n`);

        if (packages.length === 0) {
            console.log('✅ All packages already have costPerDay field. Nothing to migrate.');
            process.exit(0);
        }

        let successCount = 0;
        let errorCount = 0;

        for (const pkg of packages) {
            try {
                // Calculate and set costPerDay
                pkg.costPerDay = pkg.cost / pkg.duration;
                await pkg.save();

                console.log(`✅ Updated: ${pkg.name} | Cost: ₹${pkg.cost} | Duration: ${pkg.duration} days | Per Day: ₹${pkg.costPerDay.toFixed(2)}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to update package ${pkg.name}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Successfully updated: ${successCount} packages`);
        if (errorCount > 0) {
            console.log(`❌ Failed: ${errorCount} packages`);
        }
        console.log('='.repeat(60) + '\n');

        console.log('✨ Migration completed successfully!');

        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);

        // Close database connection on error
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }

        process.exit(1);
    }
};

// Run migration
migrate();
