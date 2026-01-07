import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Subscriber from './Subscriber.js';

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

    // Last login timestamp
    lastLogin: {
        type: Date
    },

    // Distributor fields
    serialNumber: {
        type: Number,
        sparse: true,
        min: 100000,
        max: 999999
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
    validityDate: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

}, {
    timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ serialNumber: 1 }, { sparse: true });
userSchema.index({ validityDate: 1 });

// Hide sensitive fields from JSON
userSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
    }
});

// Function to generate unique 6-digit serial number for distributors
async function generateUniqueSerialNumber() {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const serialNumber = Math.floor(100000 + Math.random() * 900000);
        const exists = await mongoose.model('User').findOne({
            serialNumber: serialNumber,
            role: 'distributor'
        });

        if (!exists) {
            return serialNumber;
        }
    }

    const timestamp = Date.now();
    const lastSixDigits = parseInt(timestamp.toString().slice(-6));
    return lastSixDigits;
}

// Pre-save hook to auto-generate serial number for distributors
userSchema.pre('save', async function (next) {
    try {
        if (this.isNew && this.role === 'distributor' && !this.serialNumber) {
            this.serialNumber = await generateUniqueSerialNumber();
        }
        next();
    } catch (error) {
        console.error('Error generating serial number:', error);
        next(error);
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ✅ NEW APPROACH: Only check and update own status, NO CASCADE
// Access control is now handled at login/authentication level
userSchema.methods.checkValidityStatus = async function () {
    if (this.validityDate && new Date() > this.validityDate && this.status === 'Active') {
        console.log(`🎯 AUTO-INACTIVATING ${this.role.toUpperCase()}: ${this.name} - Validity expired`);
        this.status = 'Inactive';
        await this.save();
        return true;
    }
    return false;
};

// ✅ NEW: Method to check if user can access system (checks upline hierarchy)
userSchema.methods.canAccess = async function () {
    const User = mongoose.model('User');

    // Check own status
    if (this.status !== 'Active') {
        return {
            canAccess: false,
            reason: 'Your account is inactive. Please contact support.'
        };
    }

    // Check validity date
    if (this.validityDate && new Date() > this.validityDate) {
        // Auto-inactivate if expired
        await this.checkValidityStatus();
        return {
            canAccess: false,
            reason: 'Your account validity has expired. Please contact support.'
        };
    }

    // For resellers, check distributor status
    if (this.role === 'reseller' && this.createdBy) {
        const distributor = await User.findById(this.createdBy).select('status validityDate name');

        if (!distributor) {
            return {
                canAccess: false,
                reason: 'Your distributor account not found.'
            };
        }

        if (distributor.status !== 'Active') {
            return {
                canAccess: false,
                reason: `Your distributor (${distributor.name}) is inactive. Please contact them.`
            };
        }

        if (distributor.validityDate && new Date() > distributor.validityDate) {
            return {
                canAccess: false,
                reason: `Your distributor (${distributor.name}) validity has expired.`
            };
        }
    }

    return {
        canAccess: true,
        reason: null
    };
};

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ✅ NEW: Static method to check subscriber access (checks subscriber + reseller + distributor)
userSchema.statics.checkSubscriberAccess = async function (subscriber) {
    if (!subscriber) {
        return {
            canAccess: false,
            reason: 'Subscriber not found.'
        };
    }

    // Check subscriber's own status
    if (subscriber.status !== 'Active') {
        return {
            canAccess: false,
            reason: 'Your subscription is not active. Please contact your reseller.'
        };
    }

    // Check subscriber's expiry
    if (subscriber.expiryDate && new Date() > subscriber.expiryDate) {
        return {
            canAccess: false,
            reason: 'Your subscription has expired. Please renew to continue.'
        };
    }

    // Check reseller status
    const reseller = await this.findById(subscriber.resellerId).select('status validityDate name createdBy');

    if (!reseller) {
        return {
            canAccess: false,
            reason: 'Your reseller account not found.'
        };
    }

    if (reseller.status !== 'Active') {
        return {
            canAccess: false,
            reason: `Your reseller (${reseller.name}) is inactive. Please contact them.`
        };
    }

    if (reseller.validityDate && new Date() > reseller.validityDate) {
        return {
            canAccess: false,
            reason: `Your reseller (${reseller.name}) validity has expired.`
        };
    }

    // Check distributor status (if reseller has one)
    if (reseller.createdBy) {
        const distributor = await this.findById(reseller.createdBy).select('status validityDate name');

        if (!distributor) {
            return {
                canAccess: false,
                reason: 'Distributor account not found.'
            };
        }

        if (distributor.status !== 'Active') {
            return {
                canAccess: false,
                reason: `The distributor (${distributor.name}) is inactive. Please contact your reseller.`
            };
        }

        if (distributor.validityDate && new Date() > distributor.validityDate) {
            return {
                canAccess: false,
                reason: `The distributor (${distributor.name}) validity has expired.`
            };
        }
    }

    return {
        canAccess: true,
        reason: null
    };
};

export default mongoose.model('User', userSchema);