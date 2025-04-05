import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { Truck, MapPin, ArrowRight, Loader2 } from "lucide-react";

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
      setMergeableTraders(res.data.
        traderMergedData
         || []);
    } catch (err) {
      console.error("Error fetching mergeable traders:", err);
      setMergeableTraders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">Trader Merging</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Optimize trader deliveries by finding compatible route pairings.
          </p>
        </div>

        <button
          className={`
            w-full max-w-xl mx-auto bg-emerald-600 hover:bg-emerald-500 
            text-white font-semibold py-4 px-8 rounded-2xl shadow-lg 
            transition-all duration-200 flex items-center justify-center gap-3
            ${loading ? "opacity-90 cursor-wait" : "hover:scale-[1.02] active:scale-[0.98]"}
          `}
          onClick={HandleMergeableTraders}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
          {loading ? "Analyzing Traders..." : "Find Mergeable Traders"}
        </button>

        {mergeableTraders !== null && (
          <div className="mt-12 space-y-12">
            {mergeableTraders.length > 0 ? (
              mergeableTraders.map((trader, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-700"
                >
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-6">
                    <h3 className="text-2xl font-bold text-white">
                      Merged Trader {index + 1}
                    </h3>
                  </div>

                  <div className="grid lg:grid-cols-1 gap-8 p-8">
                    <div className="relative">
                      {/* Trader Details */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                          <Truck className="w-6 h-6 text-emerald-400" />
                        </div>
                          <div>
                            <h4 className="text-2xl font-semibold text-white">
                            License Number: {trader.licensePlate}
                            </h4>
                            <p className="text-xl text-gray-400">
                              Load: {trader.load.join(", ")} Kg
                            </p>
                          </div>
                      </div>

                      {/* Route Details */}
                      <div className="relative pl-8">
                        <div className="bg-gray-700 rounded-2xl p-4 shadow-sm border border-gray-600 mb-8">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                            <div>
                              <p className="text-gray-200">
                                <span className="font-semibold">Source:</span> {trader.source}
                              </p>
                              <p className="text-gray-200">
                                <span className="font-semibold">Destination:</span>{" "}
                                {trader.destination}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Stops */}
                        {trader.stops.map((stop, stopIndex) => (
                          <div
                            key={stopIndex}
                            className={`
                              relative mb-8 last:mb-0 
                              transition-all duration-300 ease-in-out
                              hover:translate-x-2
                            `}
                          >
                            <div className="absolute left-0 top-0 mt-2 -ml-8">
                              <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {stopIndex + 1}
                              </div>
                            </div>

                            <div className="bg-gray-700 rounded-2xl p-4 shadow-sm border border-gray-600">
                              <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                                <p className="text-gray-200">{stop}</p>
                              </div>
                            </div>

                            {stopIndex !== trader.stops.length - 1 && (
                              <div
                                className="absolute left-[-14px] ml-[-1px] w-[2px] h-8 bg-emerald-600/30"
                                style={{ top: "2.5rem" }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-gray-800 rounded-3xl shadow-md border border-gray-700">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Truck className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Mergeable Traders Found
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
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
