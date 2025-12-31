import mongoose from 'mongoose';

const cappingSchema = new mongoose.Schema({
    distributorCapping: {
        type: Number,
        default: 10000,
        min: 0
    },
    resellerCapping: {
        type: Number,
        default: 1000,
        min: 0
    }
}, {
    timestamps: true
});

// Singleton pattern: Only one capping document should exist
cappingSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        // Create default settings if none exist
        settings = await this.create({
            distributorCapping: 10000,
            resellerCapping: 1000
        });
    }
    return settings;
};

cappingSchema.statics.updateSettings = async function (distributorCapping, resellerCapping) {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({
            distributorCapping,
            resellerCapping
        });
    } else {
        settings.distributorCapping = distributorCapping;
        settings.resellerCapping = resellerCapping;
        await settings.save();
    }
    return settings;
};

const Capping = mongoose.model('Capping', cappingSchema);

export default Capping;