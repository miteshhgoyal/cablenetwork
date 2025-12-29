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
    },
    defaultChannelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        default: null,
        validate: {
            validator: function(value) {
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

export default mongoose.model('Package', packageSchema);
