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

// ✅ PERFECTED: Cascade status to CUSTOMERS (Subscribers)
userSchema.methods.checkValidityStatus = async function () {
    if (this.validityDate && new Date() > this.validityDate && this.status === 'Active') {
        console.log(`🎯 AUTO-INACTIVATING ${this.role.toUpperCase()}: ${this.name} - Validity expired`);
        this.status = 'Inactive';
        await this.save();

        // FULL CASCADE HIERARCHY:
        if (this.role === 'distributor') {
            // 1️⃣ Inactivate ALL resellers
            const resellers = await User.updateMany(
                { createdBy: this._id, role: 'reseller' },
                { status: 'Inactive' }
            );
            console.log(`📉 Distributor ${this.name}: Inactivated ${resellers.modifiedCount} resellers`);

            // 2️⃣ Get all reseller IDs
            const resellerDocs = await User.find({ createdBy: this._id, role: 'reseller' });
            const resellerIds = resellerDocs.map(r => r._id);

            // 3️⃣ Inactivate ALL CUSTOMERS under those resellers
            if (resellerIds.length > 0) {
                const customers = await Subscriber.updateMany(
                    { resellerId: { $in: resellerIds } },
                    {
                        status: 'Inactive',
                        // expiryDate already exists - app login will check status first
                    }
                );
                console.log(`📉 Distributor ${this.name}: Inactivated ${customers.modifiedCount} CUSTOMERS`);
            }

        } else if (this.role === 'reseller') {
            // 1️⃣ Inactivate ALL CUSTOMERS under THIS reseller
            const customers = await Subscriber.updateMany(
                { resellerId: this._id },
                { status: 'Inactive' }
            );
            console.log(`📉 Reseller ${this.name}: Inactivated ${customers.modifiedCount} CUSTOMERS`);
        }
        return true;
    }
    return false;
};

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
