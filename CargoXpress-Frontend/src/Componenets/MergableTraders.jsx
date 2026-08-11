import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { Truck, MapPin, Loader2, Users, Check, X, GitMerge } from "lucide-react";
import Pagination from "./Pagination";

const MergeableTraders = () => {
  const [mergeableTraders, setMergeableTraders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleAcceptTrader = async (trader, index) => {
    try {
      console.log("Accepting trader:", trader.traderRequestId);
      setActionLoading(prev => ({ ...prev, [`accept-${index}`]: true }));
      const response = await axios.post(BASE_URL + "/acceptTrader", trader, {
        withCredentials: true,
      });
      console.log("Accept response:", response.data);
      setMergeableTraders(prev => prev.filter((_, i) => i !== index));
      alert("Trader merged successfully! Cargo will be added to the assigned truck.");
    } catch (err) {
      console.error("Error accepting trader:", err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to accept: ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`accept-${index}`]: false }));
    }
  };

  const handleRejectTrader = async (trader, index) => {
    try {
      console.log("Rejecting trader:", trader.traderRequestId);
      setActionLoading(prev => ({ ...prev, [`reject-${index}`]: true }));
      const response = await axios.post(BASE_URL + "/rejectTrader", {
        traderRequestId: trader.traderRequestId
      }, { withCredentials: true });
      console.log("Reject response:", response.data);
      setMergeableTraders(prev => prev.filter((_, i) => i !== index));
      alert("Trader request rejected.");
    } catch (err) {
      console.error("Error rejecting trader:", err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to reject: ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${index}`]: false }));
    }
  };

  const handleMergeAllTraders = async () => {
    try {
      setActionLoading(prev => ({ ...prev, mergeAll: true }));
      const res = await axios.post(BASE_URL + "/mergeAllTraders", {}, {
        withCredentials: true,
      });
      
      alert(res.data.message || "All traders merged successfully!");
      // Clear the list
      setMergeableTraders([]);
    } catch (err) {
      console.error("Error merging all traders:", err);
      alert("Failed to merge all traders. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, mergeAll: false }));
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
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

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-10">
          <button
            className={`bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-3 ${loading ? "opacity-80 cursor-wait" : "hover:-translate-y-0.5 active:translate-y-0"}`}
            onClick={HandleMergeableTraders}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
            {loading ? "Analyzing Traders..." : "Find Mergeable Traders"}
          </button>

          {mergeableTraders !== null && mergeableTraders.length > 0 && (
            <button
              className={`bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-3 ${actionLoading.mergeAll ? "opacity-80 cursor-wait" : "hover:-translate-y-0.5 active:translate-y-0"}`}
              onClick={handleMergeAllTraders}
              disabled={actionLoading.mergeAll}
            >
              {actionLoading.mergeAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitMerge className="w-5 h-5" />}
              {actionLoading.mergeAll ? "Merging All..." : "Merge All Traders"}
            </button>
          )}
        </div>

        {/* Results */}
        {mergeableTraders !== null && (
          <div id="mergeable-traders" className="space-y-6">
            {mergeableTraders.length > 0 ? (
              <>
                {mergeableTraders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((trader, index) => {
                  const actualIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <div
                      key={actualIndex}
                      className="rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all overflow-hidden"
                    >
                      {/* Card Header with Actions */}
                      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <Truck className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{trader.traderName || `Trader ${actualIndex + 1}`}</h3>
                            {trader.traderEmail && (
                              <p className="text-xs text-white/40">{trader.traderEmail}</p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptTrader(trader, actualIndex)}
                            disabled={actionLoading[`accept-${actualIndex}`] || actionLoading[`reject-${actualIndex}`]}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium ${actionLoading[`accept-${actualIndex}`] ? "opacity-50 cursor-wait" : ""}`}
                          >
                            {actionLoading[`accept-${actualIndex}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectTrader(trader, actualIndex)}
                            disabled={actionLoading[`accept-${actualIndex}`] || actionLoading[`reject-${actualIndex}`]}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium ${actionLoading[`reject-${actualIndex}`] ? "opacity-50 cursor-wait" : ""}`}
                          >
                            {actionLoading[`reject-${actualIndex}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>

                  <div className="p-6">
                    {/* Truck Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/8">
                        <Truck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-white">
                          Assigned Truck: {trader.licensePlate}
                        </h4>
                        <p className="text-sm text-white/40">
                          Truck capacity: {trader.truckTotalCapacity} kg
                        </p>
                      </div>
                    </div>

                    {/* Cargo load */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 mb-4">
                      <p className="text-xs text-emerald-400/70 mb-1 font-semibold uppercase tracking-widest">Trader Cargo to Add</p>
                      <p className="text-white/80 text-sm font-medium">
                        {Array.isArray(trader.load) ? trader.load.join(", ") : trader.load} kg
                        <span className="text-white/30 ml-2">across {trader.stops?.length} stop(s)</span>
                      </p>
                    </div>

                    {/* Route Info */}
                    <div className="p-3 rounded-xl bg-white/3 border border-white/5 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm space-y-0.5">
                          <p className="text-white/60">
                            <span className="text-white/30">From:</span> {trader.source}
                          </p>
                          <p className="text-white/60">
                            <span className="text-white/30">To:</span> {trader.destination}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stops with remaining capacity per stop */}
                    {trader.stops && trader.stops.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-3">
                          Stops & Truck Remaining Capacity
                        </p>
                        <div className="space-y-2">
                          {trader.stops.map((stop, stopIndex) => {
                            // find the index in the truck's stop list
                            const truckStopIdx = trader.truckStops?.indexOf(stop) ?? -1;
                            const remaining = truckStopIdx !== -1
                              ? (trader.truckRemainingLoad?.[truckStopIdx] ?? "—")
                              : "—";
                            const adding = trader.load?.[stopIndex] ?? 0;
                            return (
                              <div key={stopIndex} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                    <span className="text-emerald-400 text-xs font-semibold">{stopIndex + 1}</span>
                                  </div>
                                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                  <p className="text-white/70 text-sm">{stop}</p>
                                </div>
                                <div className="text-right text-xs">
                                  <p className="text-emerald-400 font-medium">+{adding} kg</p>
                                  <p className="text-white/30">{remaining} kg free</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(mergeableTraders.length / itemsPerPage)}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    document.getElementById('mergeable-traders')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </>
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
