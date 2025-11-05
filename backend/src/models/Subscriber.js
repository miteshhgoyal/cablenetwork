// backend/src/models/Subscriber.js
import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
    resellerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    subscriberName: {
        type: String,
        required: true,
    },
    serialNumber: {
        type: String,
        required: true,
    },
    macAddress: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Inactive', 'Active', 'Fresh'],
        default: 'Fresh',
    },
    expiryDate: {
        type: Date,
        default: Date.now,
    },
    packages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
    }],
    primaryPackageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
    }
}, {
    timestamps: true
});

export default mongoose.model('Subscriber', subscriberSchema);
