// backend/src/models/Channel.js
import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    lcn: {
        type: Number,
        required: true,
    },
    language: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    genre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    url: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

export default mongoose.model('Channel', channelSchema);
