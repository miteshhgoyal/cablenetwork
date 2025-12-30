import mongoose from 'mongoose';

const creditSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true,
        enum: ['Credit', 'Debit', 'Reverse Credit', 'Self Credit'],
    },
    amount: {
        type: Number,
        required: true,
    },
    senderUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    senderBalanceAfter: {
        type: Number,
        required: true
    },
    targetBalanceAfter: {
        type: Number,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for better query performance
creditSchema.index({ senderUser: 1, createdAt: -1 });
creditSchema.index({ targetUser: 1, createdAt: -1 });
creditSchema.index({ type: 1 });

export default mongoose.model('Credit', creditSchema);
