/**
 * Shared calculation for trader consignment capacity requirements.
 *
 * For CargoXpress logistics:
 * When a trader enters load requirements across multiple stops, each entry represents
 * the load or capacity required at that stop along the corridor.
 * It is NOT an additive quantity that is accumulated across stops.
 *
 * The required truck capacity is:
 *   requiredCapacity = Math.max(...validStopRequirements)
 *
 * @param {Array<number|string>|number} loads - Array of per-stop loads or a single number
 * @returns {number} The maximum required capacity across all valid stops (or 0 if invalid/empty)
 */
export function calculateRequiredCapacity(loads) {
  if (loads === null || loads === undefined) {
    return 0;
  }

  if (typeof loads === "number") {
    return !isNaN(loads) && Number.isFinite(loads) && loads > 0 ? loads : 0;
  }

  if (!Array.isArray(loads) || loads.length === 0) {
    return 0;
  }

  const validLoads = loads
    .map((v) => (v === null || v === undefined || v === "" ? NaN : Number(v)))
    .filter((n) => typeof n === "number" && !isNaN(n) && Number.isFinite(n) && n > 0);

  if (validLoads.length === 0) {
    return 0;
  }

  return Math.max(...validLoads);
}

export default calculateRequiredCapacity;
