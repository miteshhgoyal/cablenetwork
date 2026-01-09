// backend/src/models/Package.js
import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    cost: {
        type: Number,
        required: true,
    },
    genres: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    }],
    channels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
    }],
    duration: {
        type: Number,
        required: true,
        // Duration is ALWAYS in days
        // 1 month = 30 days exactly
        validate: {
            validator: function (value) {
                return value > 0;
            },
            message: 'Duration must be greater than 0 days'
        }
    },
    defaultChannelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        default: null,
        validate: {
            validator: function (value) {
                // Only validate if set
                if (!value || !this.channels) return true;
                return this.channels.some(
                    (ch) => ch.toString() === value.toString()
                );
            },
            message: 'Default channel must be one of the package channels.'
        }
    }
}, {
    timestamps: true
});

// Helper method to get cost per day
packageSchema.methods.getCostPerDay = function () {
    // For 30-day duration, cost per day = cost / 30
    // For any duration, cost per day = cost / duration
    return this.cost / this.duration;
};

// Helper method to calculate cost for specific days
packageSchema.methods.calculateCostForDays = function (days) {
    // Formula: (total cost / duration) * days
    const costPerDay = this.getCostPerDay();
    return costPerDay * days;
};

export default mongoose.model('Package', packageSchema);