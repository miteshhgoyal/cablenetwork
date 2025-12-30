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

    // Last login timestamp
    lastLogin: {
        type: Date
    },

    // Distributor fields
    serialNumber: {
        type: Number,
        sparse: true, // Only enforce uniqueness if field exists
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
userSchema.index({ serialNumber: 1 }, { sparse: true }); // NEW: Index for serial number

// Hide sensitive fields from JSON
userSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
    }
});

// NEW: Function to generate unique 6-digit serial number for distributors
async function generateUniqueSerialNumber() {
    const maxAttempts = 10; // Prevent infinite loops

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random 6-digit number (100000 to 999999)
        const serialNumber = Math.floor(100000 + Math.random() * 900000);

        // Check if this serial number already exists for distributors
        const exists = await mongoose.model('User').findOne({
            serialNumber: serialNumber,
            role: 'distributor'
        });

        if (!exists) {
            return serialNumber;
        }
    }

    // Fallback: Use timestamp-based approach if random fails
    const timestamp = Date.now();
    const lastSixDigits = parseInt(timestamp.toString().slice(-6));
    return lastSixDigits;
}

// NEW: Pre-save hook to auto-generate serial number for distributors
userSchema.pre('save', async function (next) {
    try {
        // Only generate serial number for NEW distributor documents
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

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
