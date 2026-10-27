/**
 * Shared utility for calculating required truck capacity for trader shipment requests.
 *
 * Business Semantics:
 * When a trader enters load requirements for multiple stops, each entry represents the
 * load or capacity required at that stop along the corridor. It is NOT an additive quantity
 * that accumulates at every stop.
 *
 * Therefore, the required truck capacity across the stops is:
 *   requiredCapacity = Math.max(...validStopRequirements)
 */

/**
 * Calculates the required truck capacity given an array of stop load requirements or a single numeric load.
 *
 * @param {number[]|number} loads - Array of per-stop load requirements or a single number
 * @returns {number} The maximum load requirement across all stops
 * @throws {Error} If loads is empty, missing, contains invalid, zero, or negative numbers
 */
function calculateRequiredCapacity(loads) {
    if (loads === null || loads === undefined) {
        throw new Error("Load requirement is required and cannot be null or undefined");
    }

    // Support single numeric value
    if (typeof loads === 'number') {
        if (!Number.isFinite(loads) || isNaN(loads)) {
            throw new Error("Load requirement must be a valid finite number");
        }
        if (loads <= 0) {
            throw new Error(`Invalid load requirement: ${loads} kg. Load requirement must be greater than 0 kg`);
        }
        return loads;
    }

    if (!Array.isArray(loads)) {
        throw new Error("Load requirements must be an array of numbers or a single number");
    }

    if (loads.length === 0) {
        throw new Error("Load requirements cannot be empty. At least one stop requirement must be provided");
    }

    const validatedLoads = [];

    for (let i = 0; i < loads.length; i++) {
        const val = loads[i];

        if (val === null || val === undefined || val === '') {
            throw new Error(`Invalid load requirement at stop ${i + 1}: value is missing`);
        }

        const num = Number(val);

        if (typeof val === 'boolean' || isNaN(num) || !Number.isFinite(num)) {
            throw new Error(`Invalid load requirement at stop ${i + 1}: "${val}" is not a valid number`);
        }

        if (num <= 0) {
            throw new Error(`Invalid load requirement at stop ${i + 1}: ${num} kg. Load requirement must be greater than 0 kg`);
        }

        validatedLoads.push(num);
    }

    return Math.max(...validatedLoads);
}

module.exports = {
    calculateRequiredCapacity
};
