import React, { useState, useEffect } from "react";
import { Truck, Navigation, Package, PackageCheck } from "lucide-react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";

const MergedSchedule = () => {
  const [mergedSchedule, setMergedSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMergedSchedule = async () => {
    try {
      setLoading(true);
      const res = await axios.get(BASE_URL + "/mergedSchedule", {
        withCredentials: true,
      });

      console.log("API Response:", res.data);

      if (res.data && Array.isArray(res.data.mergedSchedules)) {
        setMergedSchedule(res.data.mergedSchedules);
      } else {
        // message-only response means no schedules yet, not an error
        setMergedSchedule([]);
      }
    } catch (error) {
      console.error("Error fetching merged schedule:", error);
      setError("Failed to load schedule.");
      setMergedSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMergedSchedule();
  }, []);

  useEffect(() => {
    console.log("Updated mergedSchedule state:", mergedSchedule);
  }, [mergedSchedule]);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Truck className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Operations</p>
          <h1 className="text-4xl font-bold text-white">Transportation Dashboard</h1>
          <p className="text-white/40 mt-2 text-sm">Active merged delivery schedules</p>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-white/40 text-center py-10">Loading schedules...</p>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center mb-6">{error}</p>
        )}

        {/* Schedule Cards */}
        <div className="space-y-5">
          {mergedSchedule.length > 0 ? (
            mergedSchedule.map((truck, index) => (
              <div
                key={truck.transportationTruckId || index}
                className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Truck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      {truck.transportationTruckLicensePlate || "Unknown Truck"}
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Active
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Route */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <Navigation className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/30 mb-0.5">Route</p>
                      <p className="text-sm font-medium text-white">
                        {truck.finalSource || "Unknown"} → {truck.finalDestination || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Current Load */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <Package className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/30 mb-0.5">Current Load</p>
                      <p className="text-sm font-medium text-white">
                        {truck.finalCurrentLoad?.join(", ") || "No Data"}
                      </p>
                    </div>
                  </div>

                  {/* Remaining Load */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <PackageCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/30 mb-0.5">Remaining Load</p>
                      <p className="text-sm font-medium text-white">
                        {truck.finalRemainingLoad?.join(", ") || "No Data"}
                      </p>
                    </div>
                  </div>

                  {/* Stops */}
                  <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                    <p className="text-xs text-white/30 mb-2">Stops</p>
                    <div className="flex flex-wrap gap-2">
                      {truck.stops && truck.stops.length > 0 ? (
                        truck.stops.map((stop, stopIndex) => (
                          <span
                            key={stopIndex}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          >
                            {stop}
                          </span>
                        ))
                      ) : (
                        <p className="text-white/20 text-sm">No stops available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            !loading && (
              <div className="text-center py-16 rounded-2xl bg-white/3 border border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">No schedules available</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MergedSchedule;
