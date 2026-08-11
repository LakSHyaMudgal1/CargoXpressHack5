import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { Truck, MapPin, Loader2, GitMerge, Check, X } from "lucide-react";
import Pagination from "./Pagination";

const MergeableSchedule = () => {
  const [mergeablePairs, setMergeablePairs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleAcceptPair = async (pairId, index) => {
    try {
      console.log("Accepting pair with ID:", pairId);
      setActionLoading(prev => ({ ...prev, [`accept-${index}`]: true }));
      const response = await axios.post(BASE_URL + `/acceptPair/${pairId}`, {}, {
        withCredentials: true,
      });
      console.log("Accept response:", response.data);
      
      // Remove the pair from the list
      setMergeablePairs(prev => prev.filter((_, i) => i !== index));
      alert("Truck merge accepted! One truck will dispatch with combined load, other is now a free truck.");
    } catch (err) {
      console.error("Error accepting pair:", err);
      console.error("Error details:", err.response?.data);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to accept merge: ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`accept-${index}`]: false }));
    }
  };

  const handleRejectPair = async (pairId, index) => {
    try {
      console.log("Rejecting pair with ID:", pairId);
      setActionLoading(prev => ({ ...prev, [`reject-${index}`]: true }));
      const response = await axios.delete(BASE_URL + `/rejectPair/${pairId}`, {
        withCredentials: true,
      });
      console.log("Reject response:", response.data);
      
      // Remove the pair from the list
      setMergeablePairs(prev => prev.filter((_, i) => i !== index));
      alert("Truck merge rejected. Both trucks will dispatch separately.");
    } catch (err) {
      console.error("Error rejecting pair:", err);
      console.error("Error details:", err.response?.data);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to reject merge: ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${index}`]: false }));
    }
  };

  const handleMergeAll = async () => {
    try {
      setActionLoading(prev => ({ ...prev, mergeAll: true }));
      const res = await axios.post(BASE_URL + "/mergeAllPairs", {}, {
        withCredentials: true,
      });
      
      alert(res.data.message || "All pairs merged successfully!");
      // Clear the list
      setMergeablePairs([]);
    } catch (err) {
      console.error("Error merging all:", err);
      alert("Failed to merge all pairs. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, mergeAll: false }));
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

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-10">
          <button
            className={`bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-3 ${loading ? "opacity-80 cursor-wait" : "hover:-translate-y-0.5 active:translate-y-0"}`}
            onClick={HandleMergeablePairs}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
            {loading ? "Analyzing Routes..." : "Find Mergeable Routes"}
          </button>

          {mergeablePairs !== null && mergeablePairs.length > 0 && (
            <button
              className={`bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-3 ${actionLoading.mergeAll ? "opacity-80 cursor-wait" : "hover:-translate-y-0.5 active:translate-y-0"}`}
              onClick={handleMergeAll}
              disabled={actionLoading.mergeAll}
            >
              {actionLoading.mergeAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitMerge className="w-5 h-5" />}
              {actionLoading.mergeAll ? "Merging All..." : "Merge All"}
            </button>
          )}
        </div>

        {/* Results */}
        {mergeablePairs !== null && (
          <div id="mergeable-routes" className="space-y-8">
            {mergeablePairs.length > 0 ? (
              <>
                {mergeablePairs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((pair, index) => {
                  const actualIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <div
                      key={pair._id || actualIndex}
                      className="rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all overflow-hidden"
                    >
                      {/* Card Header with Actions */}
                      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <GitMerge className="w-4 h-4 text-emerald-400" />
                          </div>
                          <h3 className="text-lg font-bold text-white">Route Combination {actualIndex + 1}</h3>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptPair(pair._id, actualIndex)}
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
                            onClick={() => handleRejectPair(pair._id, actualIndex)}
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
                          {truck.stops && truck.stops.map((stop, stopIndex) => (
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
              );
            })}
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(mergeablePairs.length / itemsPerPage)}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    document.getElementById('mergeable-routes')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </>
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
