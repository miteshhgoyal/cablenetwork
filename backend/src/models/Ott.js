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
        validate: {
            validator: function (value) {
                // Use regular function, NOT arrow function, to access 'this'
                if (this.type === 'Web Series') {
                    return value && value > 0;
                }
                return true;
            },
            message: 'Seasons count is required and must be greater than 0 for Web Series'
        }
    }
}, {
    timestamps: true
});

ottSchema.pre('save', function (next) {
    if (this.type === 'Movie') {
        this.seasonsCount = 0;
    }
    next();
});

export default mongoose.model('Ott', ottSchema);
