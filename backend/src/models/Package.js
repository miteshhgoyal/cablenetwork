// backend/src/models/Package.js
import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    cost: { type: Number, required: true },
    costPerDay: {
        type: Number,
        required: true,
        min: 0
    },  // ← NEW FIELD
    genres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
    duration: {
        type: Number,
        required: true,
        validate: { validator: v => v > 0, message: 'Duration must be greater than 0 days' }
    },
    defaultChannelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        default: null,
        validate: {
            validator: function (value) {
                if (!value || !this.channels) return true;
                return this.channels.some(ch => ch.toString() === value.toString());
            },
            message: 'Default channel must be one of the package channels.'
        }
    }
}, { timestamps: true });

// ← NEW PRE-SAVE HOOK: Auto-calculates and sets costPerDay
packageSchema.pre('save', function (next) {
    this.costPerDay = this.cost / this.duration;
    next();
});

// Updated helper methods (now use stored value)
packageSchema.methods.getCostPerDay = function () {
    return this.costPerDay;  // Direct from DB, no recalc
};

packageSchema.methods.calculateCostForDays = function (days) {
    return this.costPerDay * days;  // Uses pre-computed costPerDay
};

export default mongoose.model('Package', packageSchema);