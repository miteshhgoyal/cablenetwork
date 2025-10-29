// backend/src/models/Credit.js
import mongoose from 'mongoose';

const creditSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true,
        enum: ['Debit', 'Reverse Credit'],
    },
    amount: {
        type: Number,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true
});

export default mongoose.model('Credit', creditSchema);
