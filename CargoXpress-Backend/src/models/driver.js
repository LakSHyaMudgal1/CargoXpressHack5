const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;

const driverSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    emailId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Not a valid Email Id");
            }
        }
    },
    password: {
        type: String,
        required: true,
        minLength: 8,
        validate(value) {
            if (!validator.isStrongPassword(value)) {
                throw new Error("Enter a Strong Password");
            }
        }
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate(value) {
            if (!validator.isMobilePhone(value, 'any') && !/^\+?[0-9]{10,15}$/.test(value)) {
                throw new Error("Enter a valid phone number");
            }
        }
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TransportCompany',
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['active', 'disabled', 'on_duty', 'off_duty'],
        default: 'active',
        index: true,
    },
    photoUrl: {
        type: String,
        default: "https://cdn-icons-png.flaticon.com/256/149/149071.png",
        validate(value) {
            if (!validator.isURL(value)) {
                throw new Error("Enter a valid URL");
            }
        }
    }
}, { timestamps: true });

driverSchema.methods.getJWT = async function() {
    const role = "driver";
    const token = await jwt.sign(
        {
            _id: this._id,
            role: role,
            companyId: this.companyId
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    return token;
};

driverSchema.methods.validatePassword = async function(passwordInput) {
    const isPasswordValid = await bcrypt.compare(passwordInput, this.password);
    return isPasswordValid;
};

// Strip sensitive fields when serializing to JSON
driverSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('Driver', driverSchema);
