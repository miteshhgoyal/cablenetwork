// scripts/migrate-cost-per-day.js
import mongoose from 'mongoose';
import Package from '../src/models/Package.js';

mongoose.connect('your-mongo-uri');

const migrate = async () => {
    const packages = await Package.find({ costPerDay: { $exists: false } });
    for (const pkg of packages) {
        pkg.costPerDay = pkg.cost / pkg.duration;
        await pkg.save();
    }
    console.log(`Updated ${packages.length} packages`);
    process.exit();
};

migrate();
