import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { Truck, MapPin, Loader2, Users } from "lucide-react";

const MergeableTraders = () => {
  const [mergeableTraders, setMergeableTraders] = useState(null);
  const [loading, setLoading] = useState(false);

  const HandleMergeableTraders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(BASE_URL + "/mergedTrader", {
        withCredentials: true,
      });
      console.log(res);
      setMergeableTraders(res.data.traderMergedData || []);
    } catch (err) {
      console.error("Error fetching mergeable traders:", err);
      setMergeableTraders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Users className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Optimization</p>
          <h1 className="text-4xl font-bold text-white mb-3">Trader Merging</h1>
          <p className="text-white/40 max-w-xl mx-auto text-sm">
            Optimize trader deliveries by finding compatible route pairings.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-10">
          <button
            className={`bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-3 ${loading ? "opacity-80 cursor-wait" : "hover:-translate-y-0.5 active:translate-y-0"}`}
            onClick={HandleMergeableTraders}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
            {loading ? "Analyzing Traders..." : "Find Mergeable Traders"}
          </button>
        </div>

        {/* Results */}
        {mergeableTraders !== null && (
          <div className="space-y-6">
            {mergeableTraders.length > 0 ? (
              mergeableTraders.map((trader, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Truck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Merged Trader {index + 1}</h3>
                  </div>

                  <div className="p-6">
                    {/* Trader Info */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/8">
                        <Truck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-white">
                          License: {trader.licensePlate}
                        </h4>
                        <p className="text-sm text-white/40">
                          Load: {trader.load.join(", ")} Kg
                        </p>
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="p-3 rounded-xl bg-white/3 border border-white/5 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm space-y-0.5">
                          <p className="text-white/60">
                            <span className="text-white/30">Source:</span> {trader.source}
                          </p>
                          <p className="text-white/60">
                            <span className="text-white/30">Destination:</span> {trader.destination}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stops Timeline */}
                    {trader.stops.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-3">Stops</p>
                        <div className="relative pl-6 space-y-3">
                          {trader.stops.map((stop, stopIndex) => (
                            <div key={stopIndex} className="relative">
                              {stopIndex !== trader.stops.length - 1 && (
                                <div className="absolute left-[-14px] top-6 w-0.5 h-full bg-emerald-500/15" />
                              )}
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
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 rounded-2xl bg-white/3 border border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-7 h-7 text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Mergeable Traders Found</h3>
                <p className="text-white/40 max-w-sm mx-auto text-sm">
                  No trader routes available for merging. Try analyzing different schedules.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MergeableTraders;
