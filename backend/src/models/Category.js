// backend/src/models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        trim: true,
        enum: ['Language', 'Genre'],
    }
}, {
    timestamps: true
});

export default mongoose.model('Category', categorySchema);
