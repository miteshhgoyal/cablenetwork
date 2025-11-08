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
    },
    // NEW: Location tracking fields
    lastLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
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
    // NEW: Device security info
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

// Create geospatial index for location queries
subscriberSchema.index({ 'lastLocation.coordinates': '2dsphere' });

export default mongoose.model('Subscriber', subscriberSchema);
