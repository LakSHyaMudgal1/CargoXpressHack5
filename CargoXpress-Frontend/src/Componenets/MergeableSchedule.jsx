import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { Truck, MapPin, Loader2, GitMerge } from "lucide-react";

const MergeableSchedule = () => {
  const [mergeablePairs, setMergeablePairs] = useState(null);
  const [loading, setLoading] = useState(false);

  const HandleMergeablePairs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(BASE_URL + "/mergeableSchedule", {
        withCredentials: true,
      });
      setMergeablePairs(res.data.mergeablePairs || []);
    } catch (err) {
      console.error("Error fetching mergeable pairs:", err);
      setMergeablePairs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <GitMerge className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Optimization</p>
          <h1 className="text-4xl font-bold text-white mb-3">Route Optimization</h1>
          <p className="text-white/40 max-w-xl mx-auto text-sm">
            Discover efficient route combinations and optimize your delivery schedules
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-10">
          <button
            className={`bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-3 ${loading ? "opacity-80 cursor-wait" : "hover:-translate-y-0.5 active:translate-y-0"}`}
            onClick={HandleMergeablePairs}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
            {loading ? "Analyzing Routes..." : "Find Mergeable Routes"}
          </button>
        </div>

        {/* Results */}
        {mergeablePairs !== null && (
          <div className="space-y-8">
            {mergeablePairs.length > 0 ? (
              mergeablePairs.map((pair, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <GitMerge className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Route Combination {index + 1}</h3>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-0">
                    {[{
                      label: "Route A",
                      stops: pair.truckOneStops,
                      licensePlate: pair.truckOneLicensePlate
                    }, {
                      label: "Route B",
                      stops: pair.truckTwoStops,
                      licensePlate: pair.truckTwoLicensePlate
                    }].map((truck, idx) => (
                      <div key={idx} className={`p-6 ${idx === 0 ? "lg:border-r border-white/5" : ""}`}>
                        {/* Truck Header */}
                        <div className="flex items-center gap-3 mb-5">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/8">
                            <Truck className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-white">{truck.label}</h4>
                            <p className="text-xs text-white/40">Vehicle: {truck.licensePlate}</p>
                          </div>
                        </div>

                        {/* Stops Timeline */}
                        <div className="relative pl-6 space-y-3">
                          {truck.stops.map((stop, stopIndex) => (
                            <div key={stopIndex} className="relative">
                              {/* Connector line */}
                              {stopIndex !== truck.stops.length - 1 && (
                                <div className="absolute left-[-14px] top-6 w-0.5 h-full bg-emerald-500/15" />
                              )}
                              {/* Stop number dot */}
                              <div className="absolute left-[-20px] top-2 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <span className="text-emerald-400 text-xs font-semibold">{stopIndex + 1}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-white/3 border border-white/5 hover:translate-x-1 transition-transform">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                  <p className="text-white/70 text-sm">{stop}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 rounded-2xl bg-white/3 border border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-7 h-7 text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Mergeable Routes Found</h3>
                <p className="text-white/40 max-w-sm mx-auto text-sm">
                  Current routes are optimized or cannot be merged. Try analyzing different time slots or areas.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MergeableSchedule;
