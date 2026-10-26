const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        index: true
    },
    driverName: {
        type: String,
        required: true
    },
    truckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required: true,
        index: true
    },
    truckLicensePlate: {
        type: String,
        required: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    tripType: {
        type: String,
        enum: ['Route', 'MergedSchedule'],
        required: true
    },
    latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
    },
    longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude] per GeoJSON standard
            required: true
        }
    },
    accuracy: {
        type: Number, // Accuracy in meters
        default: null
    },
    speed: {
        type: Number, // Speed in m/s
        default: null
    },
    heading: {
        type: Number, // Degrees from North
        default: null
    },
    altitude: {
        type: Number,
        default: null
    },
    deviceTimestamp: {
        type: Date,
        required: true,
        index: true
    },
    serverTimestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Geospatial 2dsphere index for location queries
driverLocationSchema.index({ location: '2dsphere' });

// Compound indexes for fast querying of latest position and breadcrumb history
driverLocationSchema.index({ driverId: 1, deviceTimestamp: -1 });
driverLocationSchema.index({ tripId: 1, deviceTimestamp: -1 });
driverLocationSchema.index({ truckId: 1, deviceTimestamp: -1 });

// Configurable TTL (Time-To-Live) index for automated historical data retention
// Default retention: 30 days (2592000 seconds), configurable via LOCATION_RETENTION_DAYS
const retentionDays = parseInt(process.env.LOCATION_RETENTION_DAYS || '30', 10);
const retentionSeconds = Math.max(1, retentionDays) * 24 * 60 * 60;
driverLocationSchema.index({ createdAt: 1 }, { expireAfterSeconds: retentionSeconds });

const DriverLocation = mongoose.model('DriverLocation', driverLocationSchema);

module.exports = DriverLocation;
