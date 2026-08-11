import React, { useState, useEffect } from "react";
import { Truck, Navigation, Package, PackageCheck, GitMerge, BarChart3, Users, CheckCircle2, XCircle } from "lucide-react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import Pagination from "./Pagination";

const MergedSchedule = () => {
  const [mergedSchedule, setMergedSchedule] = useState([]);
  const [acceptedTraders, setAcceptedTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPageAccepted, setCurrentPageAccepted] = useState(1);
  const [currentPageRejected, setCurrentPageRejected] = useState(1);
  const [currentPageTraders, setCurrentPageTraders] = useState(1);
  const itemsPerPage = 5;

  const fetchMergedSchedule = async () => {
    try {
      setLoading(true);
      const res = await axios.get(BASE_URL + "/mergedSchedule", { withCredentials: true });
      setMergedSchedule(res.data.mergedSchedules || []);
      setAcceptedTraders(res.data.acceptedTraders || []);
    } catch (err) {
      console.error("Error fetching merged schedule:", err);
      setError("Failed to load schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMergedSchedule(); }, []);

  const accepted = mergedSchedule.filter(s => s.status !== 'rejected');
  const rejected = mergedSchedule.filter(s => s.status === 'rejected');

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Truck className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Operations</p>
          <h1 className="text-4xl font-bold text-white">Final Merged Routes</h1>
          <p className="text-white/40 mt-2 text-sm">All admin decisions — accepted merges and independently dispatched trucks</p>
          <div className="mt-4">
            <button 
              onClick={() => document.getElementById('trader-cargo')?.scrollIntoView({ behavior: 'smooth' })} 
              className="text-sm text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4 transition-colors"
            >
              Jump to Trader Cargo ↓
            </button>
          </div>
        </div>

        {loading && <p className="text-white/40 text-center py-10">Loading schedules...</p>}
        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center mb-6">{error}</p>}

        {!loading && mergedSchedule.length === 0 && acceptedTraders.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-white/3 border border-white/5">
            <Truck className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No Routes Yet</h3>
            <p className="text-white/40 text-sm">Accept or reject truck merges to see routes here</p>
          </div>
        )}

        {/* ── Section: Accepted Truck Merges ──────────────────────────── */}
        {accepted.length > 0 && (
          <section id="accepted-trucks" className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Accepted Merges ({accepted.length})</h2>
              <span className="text-xs text-white/30">— one truck dispatches with combined load</span>
            </div>
            <div className="space-y-6">
              {accepted.slice((currentPageAccepted - 1) * itemsPerPage, currentPageAccepted * itemsPerPage).map((truck, index) => (
                <TruckCard key={truck._id || index} truck={truck} status="accepted" />
              ))}
            </div>
            <Pagination
              currentPage={currentPageAccepted}
              totalPages={Math.ceil(accepted.length / itemsPerPage)}
              onPageChange={(page) => {
                setCurrentPageAccepted(page);
                document.getElementById('accepted-trucks')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </section>
        )}

        {/* ── Section: Rejected (Independent) Trucks ──────────────────── */}
        {rejected.length > 0 && (
          <section id="independent-trucks" className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <XCircle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-bold text-white">Independent Dispatch ({rejected.length})</h2>
              <span className="text-xs text-white/30">— merge rejected, each truck goes separately</span>
            </div>
            <div className="space-y-6">
              {rejected.slice((currentPageRejected - 1) * itemsPerPage, currentPageRejected * itemsPerPage).map((truck, index) => (
                <TruckCard key={truck._id || index} truck={truck} status="rejected" />
              ))}
            </div>
            <Pagination
              currentPage={currentPageRejected}
              totalPages={Math.ceil(rejected.length / itemsPerPage)}
              onPageChange={(page) => {
                setCurrentPageRejected(page);
                document.getElementById('independent-trucks')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </section>
        )}

        {/* ── Section: Accepted Trader Merges ─────────────────────────── */}
        {acceptedTraders.length > 0 && (
          <section id="trader-cargo">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Accepted Trader Cargo ({acceptedTraders.length})</h2>
              <span className="text-xs text-white/30">— trader cargo merged with truck</span>
            </div>
            <div className="space-y-4">
              {acceptedTraders.slice((currentPageTraders - 1) * itemsPerPage, currentPageTraders * itemsPerPage).map((trader, index) => {
                // Find the matching truck schedule for remaining load context
                const matchedSchedule = mergedSchedule.find(
                  s => s.transportationTruckId === trader.truckId
                );
                return (
                  <TraderCard
                    key={trader._id || index}
                    trader={trader}
                    matchedSchedule={matchedSchedule}
                  />
                );
              })}
            </div>
            <Pagination
              currentPage={currentPageTraders}
              totalPages={Math.ceil(acceptedTraders.length / itemsPerPage)}
              onPageChange={(page) => {
                setCurrentPageTraders(page);
                document.getElementById('trader-cargo')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </section>
        )}

      </div>
    </div>
  );
};

// ── Sub-component: TruckCard ─────────────────────────────────────────────────

const TruckCard = ({ truck, status }) => {
  const isAccepted = status === 'accepted';

  return (
    <div className={`rounded-2xl bg-white/3 border overflow-hidden transition-all ${isAccepted ? "border-emerald-500/15" : "border-red-500/10"}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${isAccepted ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
            <Truck className={`w-5 h-5 ${isAccepted ? "text-emerald-400" : "text-red-400"}`} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{truck.transportationTruckLicensePlate || "Unknown"}</h2>
            <p className="text-xs text-white/40">{isAccepted ? "Primary dispatch vehicle" : "Independent dispatch"}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isAccepted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {isAccepted ? "Merged" : "Independent"}
        </span>
      </div>

      <div className="p-6 space-y-4">
        {/* Merged From — only for accepted */}
        {isAccepted && truck.mergedFromTrucks && truck.mergedFromTrucks.length > 0 && (
          <div className="p-4 rounded-xl bg-white/3 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <GitMerge className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Merged From</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {truck.mergedFromTrucks.map((t, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                  <Truck className="w-3 h-3" /> {t.licensePlate}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Route */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/3 border border-white/5">
          <Navigation className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-white/30 mb-0.5">Route</p>
            <p className="text-sm font-medium text-white">{truck.finalSource} → {truck.finalDestination}</p>
          </div>
        </div>

        {/* Capacity bar graph */}
        {truck.stops && truck.stops.length > 0 && truck.totalCapacity > 0 && (
          <div className="p-4 rounded-xl bg-white/3 border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Capacity per Stop</span>
            </div>
            <div className="space-y-3">
              {truck.stops.map((stop, i) => {
                const cur = truck.finalCurrentLoad?.[i] || 0;
                const rem = truck.finalRemainingLoad?.[i] || 0;
                const cap = truck.totalCapacity;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60 font-medium">{stop}</span>
                      <span className="text-white/40">{cur} / {cap} kg</span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 transition-all" style={{ width: `${(cur / cap) * 100}%` }} />
                      <div className="bg-emerald-500/20 transition-all" style={{ width: `${(rem / cap) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-white/50">Load</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500/20" /><span className="text-white/50">Available</span></div>
            </div>
          </div>
        )}

        {/* Load numbers */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/5">
            <Package className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/30 mb-1">Current Load (kg)</p>
              <p className="text-sm font-medium text-white">{truck.finalCurrentLoad?.join(", ") || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/5">
            <PackageCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/30 mb-1">Remaining Capacity (kg)</p>
              <p className="text-sm font-medium text-white">{truck.finalRemainingLoad?.join(", ") || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-component: TraderCard ────────────────────────────────────────────────

const TraderCard = ({ trader, matchedSchedule }) => {
  const traderLoad = Array.isArray(trader.load) ? trader.load : [];
  const traderStops = Array.isArray(trader.stops) ? trader.stops : [];
  const totalCapacity = matchedSchedule?.totalCapacity || 0;

  return (
    <div className="rounded-2xl bg-white/3 border border-blue-500/10 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-white font-semibold">Trader Cargo</span>
            <span className="text-white/30 text-xs ml-2">
              {trader.source} → {trader.destination}
            </span>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
          {trader.licensePlate}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Per-stop breakdown */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Load per Stop</span>
            {totalCapacity > 0 && (
              <span className="text-xs text-white/30 ml-1">
                (truck capacity: {totalCapacity} kg)
              </span>
            )}
          </div>

          <div className="space-y-2">
            {traderStops.map((stop, i) => {
              const traderKg = traderLoad[i] || 0;

              // Find remaining load on the truck at this stop from live schedule
              const scheduleStopIdx = matchedSchedule?.stops?.indexOf(stop) ?? -1;
              const truckRemaining = scheduleStopIdx !== -1
                ? (matchedSchedule.finalRemainingLoad?.[scheduleStopIdx] ?? null)
                : null;
              const truckCurrent = scheduleStopIdx !== -1
                ? (matchedSchedule.finalCurrentLoad?.[scheduleStopIdx] ?? null)
                : null;

              const usedPct = totalCapacity > 0 && truckCurrent !== null
                ? Math.min((truckCurrent / totalCapacity) * 100, 100)
                : 0;
              const traderPct = totalCapacity > 0
                ? Math.min((traderKg / totalCapacity) * 100, 100)
                : 0;
              const remainingPct = totalCapacity > 0 && truckRemaining !== null
                ? Math.min((truckRemaining / totalCapacity) * 100, 100)
                : 0;

              return (
                <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/5 space-y-2">
                  {/* Stop name + numbers */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                        <span className="text-blue-400 text-xs font-semibold">{i + 1}</span>
                      </div>
                      <span className="text-white/80 text-sm font-medium">{stop}</span>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <p className="text-blue-400 font-semibold">+{traderKg} kg trader cargo</p>
                      {truckRemaining !== null && (
                        <p className="text-white/40">{truckRemaining} kg remaining in truck</p>
                      )}
                      {truckCurrent !== null && (
                        <p className="text-white/30">{truckCurrent} kg total on truck</p>
                      )}
                    </div>
                  </div>

                  {/* Bar: existing truck load | trader addition | remaining space */}
                  {totalCapacity > 0 && (
                    <div className="space-y-1">
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                        {/* Existing truck load minus this trader's contribution */}
                        <div
                          className="bg-emerald-500 transition-all"
                          style={{ width: `${Math.max(usedPct - traderPct, 0)}%` }}
                          title="Truck load (before trader)"
                        />
                        {/* This trader's addition */}
                        <div
                          className="bg-blue-400 transition-all"
                          style={{ width: `${traderPct}%` }}
                          title={`Trader cargo: ${traderKg} kg`}
                        />
                        {/* Remaining */}
                        <div
                          className="bg-white/10 transition-all"
                          style={{ width: `${remainingPct}%` }}
                          title={`Remaining: ${truckRemaining} kg`}
                        />
                      </div>
                      <div className="flex gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
                          <span className="text-white/40">Truck load</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded bg-blue-400" />
                          <span className="text-white/40">Trader cargo</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded bg-white/10" />
                          <span className="text-white/40">Remaining</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-xs text-white/30 mb-1">Total Trader Cargo</p>
            <p className="text-blue-400 font-semibold">
              {traderLoad.reduce((a, b) => a + b, 0)} kg total
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-xs text-white/30 mb-1">Assigned Truck</p>
            <p className="text-white/80 font-medium">{trader.licensePlate}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-xs text-white/30 mb-1">Truck Capacity</p>
            <p className="text-white/80 font-medium">
              {totalCapacity > 0 ? `${totalCapacity} kg` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergedSchedule;
