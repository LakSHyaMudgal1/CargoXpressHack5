const mongoose = require('mongoose');
const { Schema } = mongoose;

const driverAssignmentSchema = new Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        index: true,
    },
    truckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck',
        required: true,
        index: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TransportCompany',
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['active', 'reassigned', 'completed', 'cancelled'],
        default: 'active',
        index: true,
    },
    assignedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
        default: null,
    },
    notes: {
        type: String,
        trim: true,
    }
}, { timestamps: true });

/**
 * Atomically reassigns or creates an assignment for a driver and truck.
 * Ensures any existing active assignment for either the driver or the truck is ended.
 */
driverAssignmentSchema.statics.assignDriver = async function({ driverId, truckId, companyId, notes }) {
    const now = new Date();

    // 1. Terminate any existing active assignment for this truck
    await this.updateMany(
        { truckId, status: 'active' },
        { status: 'reassigned', endedAt: now }
    );

    // 2. Terminate any existing active assignment for this driver
    await this.updateMany(
        { driverId, status: 'active' },
        { status: 'reassigned', endedAt: now }
    );

    // 3. Create the new authoritative active assignment
    const assignment = await this.create({
        driverId,
        truckId,
        companyId,
        status: 'active',
        assignedAt: now,
        notes: notes || 'Assigned to vehicle'
    });

    return assignment;
};

/**
 * Ends an active assignment for a driver or truck.
 */
driverAssignmentSchema.statics.unassignDriver = async function({ driverId, truckId, companyId, reason = 'unassigned' }) {
    const filter = { status: 'active' };
    if (driverId) filter.driverId = driverId;
    if (truckId) filter.truckId = truckId;
    if (companyId) filter.companyId = companyId;

    const result = await this.updateMany(
        filter,
        { status: reason === 'completed' ? 'completed' : 'reassigned', endedAt: new Date() }
    );

    return result;
};

/**
 * Look up the current active assignment for a driver.
 */
driverAssignmentSchema.statics.getActiveForDriver = async function(driverId) {
    return await this.findOne({ driverId, status: 'active' }).populate('truckId');
};

/**
 * Look up the current active assignment for a truck.
 */
driverAssignmentSchema.statics.getActiveForTruck = async function(truckId) {
    return await this.findOne({ truckId, status: 'active' }).populate('driverId');
};

module.exports = mongoose.model('DriverAssignment', driverAssignmentSchema);
