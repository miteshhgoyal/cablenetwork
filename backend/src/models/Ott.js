// backend/src/models/Ott.js
import mongoose from 'mongoose';

const ottSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['Movie', 'Web Series'],
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    genre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    language: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    mediaUrl: {
        type: String,
        required: true,
    },
    horizontalUrl: {
        type: String,
        required: true,
    },
    verticalUrl: {
        type: String,
        required: true,
    },
    seasonsCount: {
        type: Number,
        default: 0,
        required: () => this.type === 'Web Series'

    }
}, {
    timestamps: true
});

export default mongoose.model('Ott', ottSchema);
