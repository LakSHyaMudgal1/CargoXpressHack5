import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import {
  Truck,
  GitMerge,
  Check,
  X,
  RefreshCw,
  ShieldCheck,
  Eye,
  RotateCcw
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SearchInput from "../components/ui/SearchInput";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import ErrorPanel from "../components/ui/ErrorPanel";
import { CardSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import Pagination from "./Pagination";

const MergeableSchedule = () => {
  const [mergeablePairs, setMergeablePairs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals for deep inspection & confirmation
  const [inspectPair, setInspectPair] = useState(null);
  const [confirmAcceptPair, setConfirmAcceptPair] = useState(null);
  const [confirmRejectPair, setConfirmRejectPair] = useState(null);

  const { showToast } = useToast();

  const navigate = useNavigate();
  const user = useSelector((store) => store.user);
  const isCompany = !user?.emailId?.endsWith("@cargoxpress.com") && user?.registrationNumber !== undefined;
  const isTrader = !user?.emailId?.endsWith("@cargoxpress.com") && user?.aadharNumber !== undefined;

  const fetchMergeablePairs = useCallback(async () => {
    if (isCompany || isTrader) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(BASE_URL + "/mergeableSchedule", {
        withCredentials: true,
      });
      setMergeablePairs(res.data.mergeablePairs || []);
    } catch (err) {
      console.error("Error fetching mergeable pairs:", err);
      setError(err.response?.data?.message || err.message || "Failed to analyze corridors.");
      setMergeablePairs([]);
    } finally {
      setLoading(false);
    }
  }, [isCompany, isTrader]);

  useEffect(() => {
    if (user && isCompany) {
      showToast("neutral", "Access Restricted", "Load merge opportunities and corridor optimization are managed by dispatch administration.");
      navigate("/company", { replace: true });
      return;
    }
    if (user && isTrader) {
      showToast("neutral", "Access Restricted", "Load merge opportunities and corridor optimization are managed by dispatch administration.");
      navigate("/trader", { replace: true });
      return;
    }
    if (!isCompany && !isTrader) {
      fetchMergeablePairs();
    }
  }, [user, isCompany, isTrader, navigate, fetchMergeablePairs, showToast]);

  if (isCompany || isTrader) {
    return null;
  }

  const handleAcceptPair = async (pair) => {
    const pairId = pair._id;
    try {
      setActionLoading((prev) => ({ ...prev, [pairId]: "accept" }));
      await axios.post(
        `${BASE_URL}/acceptPair/${pairId}`,
        {},
        { withCredentials: true }
      );

      setConfirmAcceptPair(null);
      setInspectPair(null);
      await fetchMergeablePairs();

      showToast(
        "success",
        "Merge Approved",
        `${pair.truckOneLicensePlate} is now carrier. ${pair.truckTwoLicensePlate} released to FreeTruck pool.`
      );
    } catch (err) {
      console.error("Error accepting pair:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error";
      showToast("error", "Merge Approval Failed", errorMsg);
    } finally {
      setActionLoading((prev) => ({ ...prev, [pairId]: null }));
    }
  };

  const handleRejectPair = async (pair) => {
    const pairId = pair._id;
    try {
      setActionLoading((prev) => ({ ...prev, [pairId]: "reject" }));
      await axios.delete(`${BASE_URL}/rejectPair/${pairId}`, {
        withCredentials: true,
      });

      setMergeablePairs((prev) => (prev ? prev.filter((p) => p._id !== pairId) : []));
      setConfirmRejectPair(null);
      setInspectPair(null);

      showToast(
        "neutral",
        "Merge Rejected",
        `Both ${pair.truckOneLicensePlate} and ${pair.truckTwoLicensePlate} will dispatch independently.`
      );
    } catch (err) {
      console.error("Error rejecting pair:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error";
      showToast("error", "Rejection Failed", errorMsg);
    } finally {
      setActionLoading((prev) => ({ ...prev, [pairId]: null }));
    }
  };

  const handleMergeAll = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, mergeAll: true }));
      const res = await axios.post(
        `${BASE_URL}/mergeAllPairs`,
        {},
        { withCredentials: true }
      );

      showToast("success", "Batch Merge Completed", res.data.message || "All compatible pairs merged successfully.");
      setMergeablePairs([]);
    } catch (err) {
      console.error("Error merging all:", err);
      showToast("error", "Batch Merge Failed", "Could not complete all pair merges. Please review individually.");
    } finally {
      setActionLoading((prev) => ({ ...prev, mergeAll: false }));
    }
  };

  // Helper to compute shared stops
  const getSharedStops = (stops1 = [], stops2 = []) => {
    const set1 = new Set(stops1.map((s) => s.trim().toLowerCase()));
    return stops2.filter((s) => set1.has(s.trim().toLowerCase()));
  };

  // Filtering
  const filteredPairs = (mergeablePairs || []).filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const plate1 = p.truckOneLicensePlate?.toLowerCase() || "";
    const plate2 = p.truckTwoLicensePlate?.toLowerCase() || "";
    const stops1 = (p.truckOneStops || []).join(" ").toLowerCase();
    const stops2 = (p.truckTwoStops || []).join(" ").toLowerCase();
    return plate1.includes(q) || plate2.includes(q) || stops1.includes(q) || stops2.includes(q);
  });

  const totalPairs = filteredPairs.length;
  const paginatedPairs = filteredPairs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (user && isCompany) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Dispatch Optimization Workspace"
        title="Algorithmic Truck Load Merging"
        description="Inspect algorithmically detected candidate vehicle pairs sharing route corridors. Consolidate shipments onto a primary carrier and release absorbed trucks into the FreeTruck pool."
        badge={<Badge variant="aqua" dot>AI Engine Active</Badge>}
        breadcrumbs={[
          { label: "Dispatch", href: "/admin" },
          { label: "Route Optimization" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchMergeablePairs}
              isLoading={loading}
              leftIcon={RefreshCw}
            >
              Analyze Corridors
            </Button>
            {mergeablePairs && mergeablePairs.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMergeAll}
                isLoading={actionLoading.mergeAll}
                leftIcon={GitMerge}
              >
                Merge All ({mergeablePairs.length})
              </Button>
            )}
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <ErrorPanel
          title="Optimization Analysis Error"
          message={error}
          onRetry={fetchMergeablePairs}
        />
      )}

      {/* 2. Key Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Merge Pairs"
          value={mergeablePairs ? mergeablePairs.length : "—"}
          unit="Candidate Pairs"
          icon={GitMerge}
          subtitle="Awaiting dispatcher authorization"
          change={mergeablePairs?.length > 0 ? "Action Required" : "Network Optimized"}
          changeType={mergeablePairs?.length > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Vehicle Optimization"
          value={mergeablePairs ? `${mergeablePairs.length * 2}` : "—"}
          unit="Vehicles Evaluated"
          icon={Truck}
          subtitle="Pairing eligible registered trucks"
          change="Corridor Analysis"
          changeType="neutral"
        />
        <StatCard
          label="Potential FreeTrucks"
          value={mergeablePairs ? mergeablePairs.length : "—"}
          unit="Trucks Recoverable"
          icon={RotateCcw}
          subtitle="Vehicles to be freed for re-dispatch"
          change="Fleet Efficiency"
          changeType="positive"
        />
      </div>

      {/* 3. Search and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-border/80">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-subtle">
            Candidates: <strong className="text-ink">{totalPairs}</strong>
          </span>
          {mergeablePairs && mergeablePairs.length > 0 && (
            <Badge variant="aqua" size="sm">
              Compatible Segments Verified
            </Badge>
          )}
        </div>

        <div className="max-w-xs w-full">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search license plate or stop city..."
          />
        </div>
      </div>

      {/* 4. Candidate Merge Pairs List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : paginatedPairs.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paginatedPairs.map((pair, idx) => {
              const sharedStops = getSharedStops(pair.truckOneStops, pair.truckTwoStops);
              const isProcessing =
                actionLoading[pair._id] === "accept" || actionLoading[pair._id] === "reject";

              const truckOneCap = pair.truckOneId?.totalCapacity || "Standard";
              const truckTwoCap = pair.truckTwoId?.totalCapacity || "Standard";

              return (
                <Card
                  key={pair._id || idx}
                  className="p-6 flex flex-col justify-between hover:border-signal-aqua/40 transition-all duration-200"
                >
                  <div className="space-y-5">
                    {/* Header: Pair Badge + Quick Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-signal-aqua/10 text-signal-aqua">
                          <GitMerge className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-ink-subtle block">
                            Candidate #{pair._id?.slice(-6)}
                          </span>
                          <span className="text-xs font-bold text-ink">
                            Corridor Merge Opportunity
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectPair(pair)}
                          className="h-8 px-2 text-xs"
                          leftIcon={Eye}
                        >
                          Details
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmRejectPair(pair)}
                          disabled={isProcessing}
                          className="h-8 px-2 text-xs text-signal-coral hover:bg-signal-coral/10 hover:border-signal-coral/30"
                          leftIcon={X}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConfirmAcceptPair(pair)}
                          disabled={isProcessing}
                          isLoading={actionLoading[pair._id] === "accept"}
                          className="h-8 px-2.5 text-xs"
                          leftIcon={Check}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>

                    {/* Shared Stops Overlap Highlight */}
                    {sharedStops.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-signal-aqua/5 border border-signal-aqua/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-signal-aqua shrink-0" />
                          <span className="text-ink-muted">
                            Shared Overlap:{" "}
                            <strong className="text-signal-aqua font-mono">
                              {sharedStops.join(", ")}
                            </strong>
                          </span>
                        </div>
                        <Badge variant="aqua" size="sm">
                          {sharedStops.length} Common Stops
                        </Badge>
                      </div>
                    )}

                    {/* Comparison Grid: Carrier Truck vs Absorbed Truck */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* Truck One: Carrier */}
                      <div className="p-3.5 rounded-lg bg-surface/50 border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-signal-emerald font-semibold">
                            Primary Carrier
                          </span>
                          <Badge variant="emerald" size="sm">Carrier</Badge>
                        </div>
                        <h4 className="font-mono text-sm font-bold text-ink">
                          {pair.truckOneLicensePlate}
                        </h4>
                        <div className="text-[11px] text-ink-subtle">
                          Rated Capacity:{" "}
                          <span className="font-mono text-ink font-semibold">
                            {typeof truckOneCap === "number" ? `${truckOneCap.toLocaleString()} kg` : truckOneCap}
                          </span>
                        </div>
                        {/* Ordered stops */}
                        <div className="pt-2 border-t border-border/40 space-y-1">
                          <span className="text-[10px] font-mono text-ink-subtle block">
                            Route Stops ({pair.truckOneStops?.length || 0}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(pair.truckOneStops || []).map((stop, sIdx) => (
                              <span
                                key={sIdx}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  sharedStops.includes(stop)
                                    ? "bg-signal-aqua/20 text-signal-aqua border border-signal-aqua/30 font-semibold"
                                    : "bg-surface-elevated text-ink-muted"
                                }`}
                              >
                                {stop}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Truck Two: Absorbed Candidate */}
                      <div className="p-3.5 rounded-lg bg-surface/50 border border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-signal-purple font-semibold">
                            Absorbed Load
                          </span>
                          <Badge variant="purple" size="sm">To Free Pool</Badge>
                        </div>
                        <h4 className="font-mono text-sm font-bold text-ink">
                          {pair.truckTwoLicensePlate}
                        </h4>
                        <div className="text-[11px] text-ink-subtle">
                          Rated Capacity:{" "}
                          <span className="font-mono text-ink font-semibold">
                            {typeof truckTwoCap === "number" ? `${truckTwoCap.toLocaleString()} kg` : truckTwoCap}
                          </span>
                        </div>
                        {/* Ordered stops */}
                        <div className="pt-2 border-t border-border/40 space-y-1">
                          <span className="text-[10px] font-mono text-ink-subtle block">
                            Route Stops ({pair.truckTwoStops?.length || 0}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(pair.truckTwoStops || []).map((stop, sIdx) => (
                              <span
                                key={sIdx}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  sharedStops.includes(stop)
                                    ? "bg-signal-aqua/20 text-signal-aqua border border-signal-aqua/30 font-semibold"
                                    : "bg-surface-elevated text-ink-muted"
                                }`}
                              >
                                {stop}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Consolidated Result Preview */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-ink-subtle">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-signal-aqua" />
                      Frees <strong className="text-ink font-mono">{pair.truckTwoLicensePlate}</strong> for re-dispatch
                    </span>
                    <button
                      onClick={() => setInspectPair(pair)}
                      className="text-signal-aqua hover:underline font-mono text-[11px]"
                    >
                      Compare Manifest →
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPairs > itemsPerPage && (
            <div className="flex justify-center pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalPairs / itemsPerPage)}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={GitMerge}
          title={mergeablePairs === null ? "Corridor Analysis Ready" : "No Mergeable Routes Detected"}
          description={
            mergeablePairs === null
              ? "Click 'Analyze Corridors' above to run algorithmic matching on active route schedules."
              : searchQuery
              ? `No candidate merge pairs matched "${searchQuery}".`
              : "All active vehicle routes are currently operating independently without compatible corridor overlaps."
          }
          action={
            mergeablePairs === null ? (
              <Button variant="primary" onClick={fetchMergeablePairs} leftIcon={RefreshCw}>
                Analyze Corridors
              </Button>
            ) : null
          }
        />
      )}

      {/* ════════════ MODAL 1: DEEP INSPECTION & BEFORE/AFTER COMPARISON ════════════ */}
      {inspectPair && (
        <Modal
          isOpen={!!inspectPair}
          onClose={() => setInspectPair(null)}
          title="Consolidated Route & Capacity Manifest"
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="secondary" onClick={() => setInspectPair(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setConfirmAcceptPair(inspectPair);
                  setInspectPair(null);
                }}
                leftIcon={Check}
              >
                Proceed to Approve
              </Button>
            </div>
          }
        >
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-lg bg-surface-elevated border border-border space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-signal-aqua font-semibold">
                Optimization Overview
              </span>
              <p className="text-ink-muted text-sm leading-relaxed">
                Merging <strong className="text-ink">{inspectPair.truckTwoLicensePlate}</strong> into primary carrier{" "}
                <strong className="text-ink">{inspectPair.truckOneLicensePlate}</strong> combines their cargo payloads into a unified multi-stop corridor, eliminating duplicate highway legs.
              </p>
            </div>

            {/* Before vs After Itinerary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle font-semibold block">
                  Before: Disjoint Routes
                </span>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-surface-elevated border border-border/60">
                    <p className="font-mono font-bold text-ink">{inspectPair.truckOneLicensePlate}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {inspectPair.truckOneStops?.join(" → ")}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-elevated border border-border/60">
                    <p className="font-mono font-bold text-ink">{inspectPair.truckTwoLicensePlate}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {inspectPair.truckTwoStops?.join(" → ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-signal-aqua/5 border border-signal-aqua/20 space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-signal-aqua font-semibold block">
                  Proposed: Consolidated Route
                </span>
                <div className="p-3 rounded-lg bg-surface-elevated border border-signal-aqua/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-signal-aqua">
                      Carrier: {inspectPair.truckOneLicensePlate}
                    </span>
                    <Badge variant="emerald" size="sm">Optimized Manifest</Badge>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <span className="text-[10px] font-mono text-ink-subtle block">Combined Stop Sequence:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set([...(inspectPair.truckOneStops || []), ...(inspectPair.truckTwoStops || [])])).map(
                        (stop, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-surface border border-border font-mono text-[11px] text-ink"
                          >
                            {sIdx + 1}. {stop}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FreeTruck release notice */}
            <div className="p-3 rounded-lg bg-signal-purple/10 border border-signal-purple/20 flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-signal-purple shrink-0" />
              <p className="text-ink-muted">
                <strong className="text-ink">{inspectPair.truckTwoLicensePlate}</strong> will immediately transition to the FreeTruck pool and become available for new consignments.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════ MODAL 2: CONFIRM MERGE APPROVAL ════════════ */}
      {confirmAcceptPair && (
        <Modal
          isOpen={!!confirmAcceptPair}
          onClose={() => setConfirmAcceptPair(null)}
          title="Confirm Route Consolidation"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setConfirmAcceptPair(null)}
                disabled={actionLoading[confirmAcceptPair._id] === "accept"}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAcceptPair(confirmAcceptPair)}
                isLoading={actionLoading[confirmAcceptPair._id] === "accept"}
                leftIcon={Check}
              >
                Confirm & Approve Merge
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-sm text-ink font-medium leading-relaxed">
              Are you sure you want to approve this corridor merge?
            </p>
            <div className="p-4 rounded-lg bg-surface-elevated border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Primary Carrier:</span>
                <span className="font-mono font-bold text-signal-emerald">
                  {confirmAcceptPair.truckOneLicensePlate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Absorbed Vehicle:</span>
                <span className="font-mono font-bold text-signal-purple">
                  {confirmAcceptPair.truckTwoLicensePlate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">FreeTruck Reallocation:</span>
                <span className="text-signal-aqua font-semibold">Immediate</span>
              </div>
            </div>
            <p className="text-ink-subtle text-[11px]">
              This operation executes segment capacity checks, updates live carrier driver assignments, and writes an authoritative entry to the merge decision audit log.
            </p>
          </div>
        </Modal>
      )}

      {/* ════════════ MODAL 3: CONFIRM MERGE REJECTION ════════════ */}
      {confirmRejectPair && (
        <Modal
          isOpen={!!confirmRejectPair}
          onClose={() => setConfirmRejectPair(null)}
          title="Reject Route Consolidation"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setConfirmRejectPair(null)}
                disabled={actionLoading[confirmRejectPair._id] === "reject"}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRejectPair(confirmRejectPair)}
                isLoading={actionLoading[confirmRejectPair._id] === "reject"}
                leftIcon={X}
              >
                Confirm Rejection
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-sm text-ink font-medium leading-relaxed">
              Rejecting this combination allows both trucks to operate on their scheduled routes independently.
            </p>
            <div className="p-3 rounded-lg bg-signal-coral/10 border border-signal-coral/20 text-signal-coral">
              <strong>Notice:</strong> This pair proposal will be dismissed from the active optimization queue.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MergeableSchedule;
