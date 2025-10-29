// backend/src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['distributor', 'reseller', 'admin'],
        required: true,
        default: 'reseller'
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },

    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // Last login timestamp - ADD THIS
    lastLogin: {
        type: Date
    },

    // Reseller fields
    subscriberLimit: {
        type: Number,
    },
    partnerCode: {
        type: String,
    },
    packages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
    }],
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // Don't require it by default - let application logic handle it
    },

}, {
    timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Hide sensitive fields from JSON
userSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
