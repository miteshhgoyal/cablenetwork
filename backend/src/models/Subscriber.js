// backend/src/models/Subscriber.js
import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
    resellerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    partnerCode: {
        type: String,
        required: true
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
        trim: true
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
    },
    lastLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        },
        timestamp: {
            type: Date,
            default: null
        },
        address: {
            type: String,
            default: null
        }
    },
    locationHistory: [{
        coordinates: {
            type: [Number],
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        address: String
    }],
    deviceInfo: {
        isRooted: {
            type: Boolean,
            default: false
        },
        isVPNActive: {
            type: Boolean,
            default: false
        },
        lastIPAddress: String,
        deviceModel: String,
        osVersion: String,
        appVersion: String
    }
}, {
    timestamps: true
});

// Create geospatial index
subscriberSchema.index({ 'lastLocation.coordinates': '2dsphere' });

// Create unique index for macAddress
subscriberSchema.index({ resellerId: 1, serialNumber: 1 }, { unique: true });

export default mongoose.model('Subscriber', subscriberSchema);
