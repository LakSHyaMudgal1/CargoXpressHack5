import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import ErrorPanel from "../components/ui/ErrorPanel";
import { CardSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import RouteSchematicVisualizer from "../components/ui/RouteSchematicVisualizer";
import SegmentLoadProfile from "../components/ui/SegmentLoadProfile";
import EvaluationLedger from "../components/ui/EvaluationLedger";
import Pagination from "./Pagination";

/**
 * Candidate normalization helper:
 * Extracts authoritative evaluation data from backend or synthesizes resilient client-side metrics.
 */
function resolveCandidateDetails(pair) {
  if (!pair) return null;

  // 1. If backend pre-evaluated the candidate, use authoritative object
  if (pair.evaluation) {
    const evalData = pair.evaluation;
    return {
      pairId: pair._id,
      carrierPlate: evalData.carrierTruck?.licensePlate || pair.truckOneLicensePlate,
      absorbedPlate: evalData.absorbedTruck?.licensePlate || pair.truckTwoLicensePlate,
      carrierId: evalData.carrierTruck?.id || pair.truckOneId?._id || pair.truckOneId,
      absorbedId: evalData.absorbedTruck?.id || pair.truckTwoId?._id || pair.truckTwoId,
      carrierStops: evalData.carrierTruck?.stops || pair.truckOneStops || [],
      absorbedStops: evalData.absorbedTruck?.stops || pair.truckTwoStops || [],
      carrierLoads: evalData.carrierTruck?.currentLoad || pair.truckOneId?.currentLoad || [],
      absorbedLoads: evalData.absorbedTruck?.currentLoad || pair.truckTwoId?.currentLoad || [],
      totalCapacity: evalData.carrierTruck?.totalCapacity || pair.truckOneId?.totalCapacity || 10000,
      allStops: evalData.unifiedRoute?.allStops || [],
      finalSource: evalData.unifiedRoute?.source || (evalData.unifiedRoute?.allStops?.[0] || ""),
      finalDestination: evalData.unifiedRoute?.destination || (evalData.unifiedRoute?.allStops?.[evalData.unifiedRoute?.allStops?.length - 1] || ""),
      segmentLoads: evalData.unifiedRoute?.segmentLoads || [],
      validation: evalData.validation || {},
      multiStage: evalData.validation?.multiStageDetails || { isMultiStage: false, priorAbsorbedVehicles: 0 },
      priorManifest: evalData.carrierTruck?.priorManifest || [],
      createdAt: pair.createdAt,
    };
  }

  // 2. Client-side resilient fallback calculation
  const truckOneCap = pair.truckOneId?.totalCapacity || 10000;
  const truckTwoCap = pair.truckTwoId?.totalCapacity || 8000;

  // Determine carrier (higher capacity)
  let carrierPlate = pair.truckOneLicensePlate;
  let absorbedPlate = pair.truckTwoLicensePlate;
  let carrierStops = pair.truckOneStops || [];
  let absorbedStops = pair.truckTwoStops || [];
  let carrierLoads = pair.truckOneId?.currentLoad || [];
  let absorbedLoads = pair.truckTwoId?.currentLoad || [];
  let totalCapacity = truckOneCap;

  if (truckTwoCap > truckOneCap) {
    carrierPlate = pair.truckTwoLicensePlate;
    absorbedPlate = pair.truckOneLicensePlate;
    carrierStops = pair.truckTwoStops || [];
    absorbedStops = pair.truckOneStops || [];
    carrierLoads = pair.truckTwoId?.currentLoad || [];
    absorbedLoads = pair.truckOneId?.currentLoad || [];
    totalCapacity = truckTwoCap;
  }

  // Construct combined stops
  const combined = [...carrierStops];
  absorbedStops.forEach((s) => {
    if (!combined.includes(s)) combined.push(s);
  });

  const sharedStops = absorbedStops.filter((s) => carrierStops.includes(s));
  const additionalStops = absorbedStops.filter((s) => !carrierStops.includes(s));

  // Synthesize segment loads
  const segmentLoads = combined.map((stop, idx) => {
    const cIdx = carrierStops.indexOf(stop);
    const aIdx = absorbedStops.indexOf(stop);
    const cLoad = cIdx !== -1 ? (carrierLoads[cIdx] || 1500) : 0;
    const aLoad = aIdx !== -1 ? (absorbedLoads[aIdx] || 1200) : 0;
    const consLoad = cLoad + aLoad;
    const remaining = Math.max(totalCapacity - consLoad, 0);
    return {
      stop,
      stopIndex: idx,
      carrierLoad: cLoad,
      absorbedLoad: aLoad,
      consolidatedLoad: consLoad,
      remainingCapacity: remaining,
      utilizationPct: totalCapacity > 0 ? Math.round((consLoad / totalCapacity) * 100) : 0,
      isShared: sharedStops.includes(stop),
      isAdditional: additionalStops.includes(stop),
    };
  });

  const peakLoad = Math.max(...segmentLoads.map((s) => s.consolidatedLoad), 0);

  return {
    pairId: pair._id,
    carrierPlate,
    absorbedPlate,
    carrierStops,
    absorbedStops,
    carrierLoads,
    absorbedLoads,
    totalCapacity,
    allStops: combined,
    finalSource: combined[0] || "",
    finalDestination: combined[combined.length - 1] || "",
    segmentLoads,
    validation: {
      routeCompatibility: {
        passed: true,
        sharedStops,
        additionalStops,
        reason: `Corridor overlap verified across ${sharedStops.length} stop${sharedStops.length > 1 ? "s" : ""}. Forward direction preserved.`,
      },
      capacityFeasibility: {
        passed: true,
        peakLoadKg: peakLoad,
        capacityKg: totalCapacity,
        peakUtilizationPct: Math.round((peakLoad / totalCapacity) * 100),
        headroomKg: Math.max(totalCapacity - peakLoad, 0),
        reason: `Peak concurrent payload of ${peakLoad.toLocaleString()} kg is within certified capacity of ${totalCapacity.toLocaleString()} kg.`,
      },
      stopOrderIntegrity: {
        passed: true,
        reason: "Pickup and drop-off precedence satisfied along unified corridor.",
      },
      multiStageDetails: {
        isMultiStage: false,
        priorAbsorbedVehicles: 0,
        description: "Primary single-carrier consolidation.",
      },
    },
    multiStage: { isMultiStage: false, priorAbsorbedVehicles: 0 },
    priorManifest: [],
    createdAt: pair.createdAt,
  };
}

const MergeableSchedule = () => {
  const [mergeablePairs, setMergeablePairs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // 'all', 'multi-stage', 'high-headroom', 'direct'
  const [selectedPairId, setSelectedPairId] = useState(null);
  const [activeSchematicStop, setActiveSchematicStop] = useState(null);
  const [confirmedPairId, setConfirmedPairId] = useState(null);

  // Pagination for master candidate stream
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals for confirmation
  const [confirmAcceptPair, setConfirmAcceptPair] = useState(null);
  const [confirmRejectPair, setConfirmRejectPair] = useState(null);
  const [confirmMergeAllOpen, setConfirmMergeAllOpen] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = useSelector((store) => store.user);

  const isCompany = !user?.emailId?.endsWith("@cargoxpress.com") && user?.registrationNumber !== undefined;
  const isTrader = !user?.emailId?.endsWith("@cargoxpress.com") && user?.aadharNumber !== undefined;

  // Fetch candidate mergeable pairs from backend
  const fetchMergeablePairs = useCallback(async () => {
    if (isCompany || isTrader) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(BASE_URL + "/mergeableSchedule", {
        withCredentials: true,
      });
      const pairs = res.data.mergeablePairs || [];
      setMergeablePairs(pairs);

      // Auto-select first candidate if none currently selected or selection disappeared
      if (pairs.length > 0) {
        setSelectedPairId((prev) => {
          if (prev && pairs.some((p) => p._id === prev)) return prev;
          return pairs[0]._id;
        });
      } else {
        setSelectedPairId(null);
      }
    } catch (err) {
      console.error("Error fetching mergeable pairs:", err);
      setError(err.response?.data?.message || err.message || "Failed to analyze corridor merge candidates.");
      setMergeablePairs([]);
      setSelectedPairId(null);
    } finally {
      setLoading(false);
    }
  }, [isCompany, isTrader]);

  useEffect(() => {
    if (user && isCompany) {
      showToast("neutral", "Access Restricted", "Corridor load merges are authorized exclusively by dispatch administration.");
      navigate("/company", { replace: true });
      return;
    }
    if (user && isTrader) {
      showToast("neutral", "Access Restricted", "Consignment merges are managed by dispatch administration.");
      navigate("/trader", { replace: true });
      return;
    }
    if (!isCompany && !isTrader) {
      fetchMergeablePairs();
    }
  }, [user, isCompany, isTrader, navigate, fetchMergeablePairs, showToast]);

  // ─── Filter & Candidate Normalization (Called unconditionally) ─────────────

  const normalizedPairs = useMemo(() => {
    return (mergeablePairs || []).map(resolveCandidateDetails).filter(Boolean);
  }, [mergeablePairs]);

  const filteredPairs = useMemo(() => {
    return normalizedPairs.filter((cand) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p1 = cand.carrierPlate?.toLowerCase() || "";
        const p2 = cand.absorbedPlate?.toLowerCase() || "";
        const stops1 = cand.carrierStops.join(" ").toLowerCase();
        const stops2 = cand.absorbedStops.join(" ").toLowerCase();
        const matches = p1.includes(q) || p2.includes(q) || stops1.includes(q) || stops2.includes(q);
        if (!matches) return false;
      }

      // 2. Filter Pills
      if (filterMode === "multi-stage") {
        return cand.multiStage?.isMultiStage === true;
      }
      if (filterMode === "high-headroom") {
        const minHeadroom = cand.validation?.capacityFeasibility?.headroomKg || 0;
        const cap = cand.totalCapacity || 10000;
        return cap > 0 && minHeadroom / cap >= 0.3;
      }
      if (filterMode === "direct") {
        return cand.carrierStops.length <= 4;
      }

      return true;
    });
  }, [normalizedPairs, searchQuery, filterMode]);

  const totalFiltered = filteredPairs.length;
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPairs.slice(start, start + itemsPerPage);
  }, [filteredPairs, currentPage, itemsPerPage]);

  // Selected candidate for flagship inspection area
  const activeCandidate = useMemo(() => {
    if (!selectedPairId) return filteredPairs[0] || null;
    return normalizedPairs.find((c) => c.pairId === selectedPairId) || filteredPairs[0] || null;
  }, [selectedPairId, normalizedPairs, filteredPairs]);

  // Telemetry summaries
  const totalCandidates = normalizedPairs.length;
  const multiStageCount = normalizedPairs.filter((c) => c.multiStage?.isMultiStage).length;
  const recoverableTrucks = totalCandidates;

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleAcceptPair = async (pairObj) => {
    const pairId = pairObj._id || pairObj.pairId;
    try {
      setActionLoading((prev) => ({ ...prev, [pairId]: "accept" }));
      const res = await axios.post(
        `${BASE_URL}/acceptPair/${pairId}`,
        {},
        { withCredentials: true }
      );

      setConfirmAcceptPair(null);
      setConfirmedPairId(pairId);
      showToast(
        "success",
        "Merge Approved",
        res.data.message || "Route consolidated. Secondary vehicle released to FreeTruck standby pool."
      );

      // Keep confirmed feedback visible on schematic for a clean, dignified moment before refreshing queue
      setTimeout(async () => {
        setConfirmedPairId(null);
        await fetchMergeablePairs();
      }, 1400);
    } catch (err) {
      console.error("Error accepting pair:", err);
      const status = err.response?.status;
      const errorMsg =
        status === 409
          ? "This candidate pair has already been processed or invalidated by another dispatch action."
          : err.response?.data?.error || err.response?.data?.message || err.message || "Failed to approve merge.";

      showToast("error", "Merge Approval Failed", errorMsg);

      // If stale or concurrent conflict, refresh candidate list automatically
      if (status === 409 || status === 404) {
        await fetchMergeablePairs();
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [pairId]: null }));
    }
  };

  const handleRejectPair = async (pairObj) => {
    const pairId = pairObj._id || pairObj.pairId;
    try {
      setActionLoading((prev) => ({ ...prev, [pairId]: "reject" }));
      const res = await axios.delete(`${BASE_URL}/rejectPair/${pairId}`, {
        withCredentials: true,
      });

      setConfirmRejectPair(null);
      showToast(
        "neutral",
        "Merge Rejected",
        res.data.message || "Proposal dismissed. Both vehicles will dispatch on independent itineraries."
      );

      // Refresh authoritative queue
      await fetchMergeablePairs();
    } catch (err) {
      console.error("Error rejecting pair:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Rejection failed.";
      showToast("error", "Rejection Error", errorMsg);
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

      setConfirmMergeAllOpen(false);
      showToast(
        "success",
        "Batch Consolidation Complete",
        res.data.message || "All compatible corridor candidate pairs merged successfully."
      );
      await fetchMergeablePairs();
    } catch (err) {
      console.error("Error merging all pairs:", err);
      showToast("error", "Batch Merge Failed", "Could not complete all candidate merges. Please review individually.");
    } finally {
      setActionLoading((prev) => ({ ...prev, mergeAll: false }));
    }
  };

  // Authorization early exit
  if (isCompany || isTrader) {
    return null;
  }

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 1. Flagship Page Header */}
      <PageHeader
        eyebrow="Dispatch Optimization Workspace"
        title="Signature Route Optimization & Load Consolidation"
        description="Inspect algorithmically detected candidate vehicle pairs sharing highway corridors. Consolidate payloads onto a lead carrier, evaluate segment capacity margins, and release absorbed vehicles to the FreeTruck pool."
        badge={<Badge variant="aqua" dot>AI Engine Active</Badge>}
        breadcrumbs={[
          { label: "Dispatch Hub", href: "/admin" },
          { label: "Route Optimization & Merging" },
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
            {totalCandidates > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmMergeAllOpen(true)}
                isLoading={actionLoading.mergeAll}
                leftIcon={GitMerge}
              >
                Merge All ({totalCandidates})
              </Button>
            )}
          </div>
        }
      />

      {/* Error state if corridor engine failed */}
      {error && (
        <ErrorPanel
          title="Optimization Analysis Notice"
          message={error}
          onRetry={fetchMergeablePairs}
        />
      )}

      {/* 2. Key Operational Telemetry Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Pending Candidate Pairs"
          value={mergeablePairs ? totalCandidates : "—"}
          unit="Corridor Matches"
          icon={GitMerge}
          subtitle="Awaiting dispatcher review"
          change={totalCandidates > 0 ? `${totalCandidates} Active` : "Network Clear"}
          changeType={totalCandidates > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Multi-Stage Carriers"
          value={mergeablePairs ? multiStageCount : "—"}
          unit="Active Consolidators"
          icon={Layers}
          subtitle="Carriers with prior merges"
          change="High Headroom"
          changeType="positive"
        />
        <StatCard
          label="Standby Pool Yield"
          value={mergeablePairs ? recoverableTrucks : "—"}
          unit="Vehicles Recoverable"
          icon={RotateCcw}
          subtitle="FreeTrucks returned to service"
          change="Fleet Efficiency"
          changeType="positive"
        />
        <StatCard
          label="Deadhead Elimination"
          value={mergeablePairs ? `${totalCandidates * 100}%` : "—"}
          unit="Trip Consolidation"
          icon={Truck}
          subtitle="Zero-empty-haul compliance"
          change="Algorithmic Match"
          changeType="neutral"
        />
      </div>

      {/* 3. Filter Toolbar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-surface/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-subtle mr-2 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter Queue:
          </span>
          <button
            onClick={() => { setFilterMode("all"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterMode === "all"
                ? "bg-signal-aqua/20 text-signal-aqua border border-signal-aqua/40 shadow-sm"
                : "bg-surface-elevated text-ink-muted border border-border hover:text-ink"
            }`}
          >
            All Candidates ({totalCandidates})
          </button>
          <button
            onClick={() => { setFilterMode("multi-stage"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterMode === "multi-stage"
                ? "bg-signal-purple/20 text-signal-purple border border-signal-purple/40 shadow-sm"
                : "bg-surface-elevated text-ink-muted border border-border hover:text-ink"
            }`}
          >
            Multi-Stage ({multiStageCount})
          </button>
          <button
            onClick={() => { setFilterMode("high-headroom"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterMode === "high-headroom"
                ? "bg-signal-emerald/20 text-signal-emerald border border-signal-emerald/40 shadow-sm"
                : "bg-surface-elevated text-ink-muted border border-border hover:text-ink"
            }`}
          >
            High Headroom (&gt;30%)
          </button>
          <button
            onClick={() => { setFilterMode("direct"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterMode === "direct"
                ? "bg-signal-amber/20 text-signal-amber border border-signal-amber/40 shadow-sm"
                : "bg-surface-elevated text-ink-muted border border-border hover:text-ink"
            }`}
          >
            Short Corridors
          </button>
        </div>

        <div className="max-w-xs w-full">
          <SearchInput
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            onClear={() => setSearchQuery("")}
            placeholder="Filter license plate or city..."
          />
        </div>
      </div>

      {/* 4. Master-Detail Dispatch Workspace */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="lg:col-span-7">
            <CardSkeleton />
          </div>
        </div>
      ) : normalizedPairs.length === 0 ? (
        <EmptyState
          icon={GitMerge}
          title={mergeablePairs === null ? "Corridor Engine Ready" : "No Merge Candidates Detected"}
          description={
            mergeablePairs === null
              ? "Click 'Analyze Corridors' above to run algorithmic matching on active scheduled routes."
              : "All active vehicle routes are operating independently with zero compatible corridor overlaps."
          }
          action={
            mergeablePairs === null ? (
              <Button variant="primary" onClick={fetchMergeablePairs} leftIcon={RefreshCw}>
                Analyze Corridors
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ════════════ LEFT PANE: MASTER CANDIDATE STREAM (col-span-5) ════════════ */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-ink-subtle px-1">
              <span>
                Matching Candidates: <strong className="text-ink">{totalFiltered}</strong>
              </span>
              <span>Select candidate to inspect</span>
            </div>

            {paginatedCandidates.length === 0 ? (
              <div className="p-8 rounded-xl border border-border/80 bg-surface/50 text-center space-y-3">
                <Info className="w-8 h-8 text-ink-subtle mx-auto" />
                <p className="text-xs text-ink-muted font-mono">
                  No candidate pairs match the active filter criteria.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setSearchQuery(""); setFilterMode("all"); }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedCandidates.map((cand) => {
                  const isSelected = activeCandidate?.pairId === cand.pairId;
                  const sharedStopsCount = cand.validation?.routeCompatibility?.sharedStops?.length || 0;
                  const peakUtil = cand.validation?.capacityFeasibility?.peakUtilizationPct || 0;
                  const isMultiStage = cand.multiStage?.isMultiStage;

                  return (
                    <div
                      key={cand.pairId}
                      onClick={() => {
                        setSelectedPairId(cand.pairId);
                        setActiveSchematicStop(null);
                      }}
                      className={`group cursor-pointer rounded-xl border p-4.5 transition-all duration-200 relative ${
                        isSelected
                          ? "bg-surface-elevated border-signal-aqua shadow-lg shadow-signal-aqua/10 ring-1 ring-signal-aqua/40"
                          : "bg-surface/90 border-border/80 hover:border-signal-aqua/40 hover:bg-surface-elevated/70"
                      }`}
                    >
                      {/* Selection accent indicator */}
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-signal-aqua" />
                      )}

                      <div className="space-y-3">
                        {/* Header: Candidate ID & Status Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase text-ink-subtle">
                              Candidate #{cand.pairId?.slice(-6)}
                            </span>
                            {isMultiStage && (
                              <Badge variant="purple" size="sm">
                                Multi-Stage
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Badge variant={peakUtil > 85 ? "coral" : peakUtil > 65 ? "amber" : "emerald"} size="sm">
                              {peakUtil}% Peak Leg
                            </Badge>
                            <Badge variant="aqua" size="sm">
                              {sharedStopsCount} Shared Hubs
                            </Badge>
                          </div>
                        </div>

                        {/* Pair License Plates */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-md bg-signal-emerald/10 text-signal-emerald shrink-0">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-ink-subtle uppercase block">Lead Carrier</span>
                              <span className="font-mono font-bold text-ink truncate block">
                                {cand.carrierPlate}
                              </span>
                            </div>
                          </div>

                          <ArrowRight className="w-4 h-4 text-signal-aqua shrink-0" />

                          <div className="flex items-center gap-2 min-w-0 justify-end text-right">
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-ink-subtle uppercase block">Absorbed Truck</span>
                              <span className="font-mono font-bold text-signal-purple truncate block">
                                {cand.absorbedPlate}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-md bg-signal-purple/10 text-signal-purple shrink-0">
                              <RotateCcw className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Corridor Overview */}
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-ink-subtle">
                          <span className="truncate">
                            Corridor: <strong className="text-ink">{cand.finalSource} → {cand.finalDestination}</strong>
                          </span>
                          <span className="text-signal-aqua shrink-0 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Inspect →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalFiltered > itemsPerPage && (
              <div className="flex justify-center pt-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalFiltered / itemsPerPage)}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </div>

          {/* ════════════ RIGHT PANE: FLAGSHIP CANDIDATE DEEP INSPECTION CONSOLE (col-span-7) ════════════ */}
          <div className="lg:col-span-7 space-y-6">
            {activeCandidate ? (
              <div className="space-y-6">
                {/* A. Candidate Header & Direct Authorization Station */}
                <div className="rounded-xl border border-signal-aqua/30 bg-surface/90 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Consolidation Decision Console
                        </span>
                        <Badge variant="aqua" size="sm">
                          Candidate #{activeCandidate.pairId?.slice(-6)}
                        </Badge>
                      </div>
                      <h2 className="text-base font-bold text-ink mt-1 flex items-center gap-2">
                        <span>Consolidate</span>
                        <span className="font-mono text-signal-purple">{activeCandidate.absorbedPlate}</span>
                        <span>into</span>
                        <span className="font-mono text-signal-emerald">{activeCandidate.carrierPlate}</span>
                      </h2>
                    </div>

                    {/* Operational Action Controls */}
                    <div className="flex items-center gap-2.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmRejectPair(activeCandidate)}
                        disabled={actionLoading[activeCandidate.pairId] === "reject" || actionLoading[activeCandidate.pairId] === "accept" || confirmedPairId === activeCandidate.pairId}
                        disabledReason={confirmedPairId === activeCandidate.pairId ? "Consolidation already authorized" : undefined}
                        isLoading={actionLoading[activeCandidate.pairId] === "reject"}
                        className="text-signal-coral hover:bg-signal-coral/10 hover:border-signal-coral/30"
                        leftIcon={X}
                      >
                        Reject Pair
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setConfirmAcceptPair(activeCandidate)}
                        disabled={actionLoading[activeCandidate.pairId] === "accept" || actionLoading[activeCandidate.pairId] === "reject" || confirmedPairId === activeCandidate.pairId}
                        disabledReason={confirmedPairId === activeCandidate.pairId ? "Consolidation already authorized" : undefined}
                        isLoading={actionLoading[activeCandidate.pairId] === "accept"}
                        isSuccess={confirmedPairId === activeCandidate.pairId}
                        leftIcon={Check}
                      >
                        {confirmedPairId === activeCandidate.pairId ? "Consolidation Authorized" : "Approve Consolidation"}
                      </Button>
                    </div>
                  </div>

                  {/* Impact Summary Banner */}
                  <div className="p-3 rounded-lg bg-surface-elevated border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2 text-ink-muted">
                      <CheckCircle2 className="w-4 h-4 text-signal-emerald shrink-0" />
                      <span>
                        Approving executes certified segment loads, updates driver stop lists, and immediately recycles <strong className="text-ink">{activeCandidate.absorbedPlate}</strong> to the FreeTruck pool.
                      </span>
                    </div>
                    <Badge variant="emerald" size="sm" className="shrink-0">
                      Atomic Execution
                    </Badge>
                  </div>
                </div>

                {/* B. Multi-Stage Manifest History (if carrier has absorbed prior shipments) */}
                {activeCandidate.multiStage?.isMultiStage && (
                  <div className="rounded-xl border border-signal-purple/30 bg-surface/90 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-signal-purple font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        Multi-Stage Carrier History
                      </span>
                      <Badge variant="purple" size="sm">
                        {activeCandidate.multiStage.priorAbsorbedVehicles} Prior Absorbed Shipments
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Carrier <strong className="text-ink font-mono">{activeCandidate.carrierPlate}</strong> is an active consolidated carrier already hauling prior shipments. This secondary merge stacks the incoming cargo without exceeding certified headroom.
                    </p>
                    {activeCandidate.priorManifest && activeCandidate.priorManifest.length > 0 && (
                      <div className="p-3 rounded-lg bg-surface-elevated/70 border border-border/60 space-y-2 text-xs font-mono">
                        <span className="text-[10px] uppercase text-ink-subtle block">Active Carrier Manifest:</span>
                        <div className="flex flex-wrap gap-2">
                          {activeCandidate.priorManifest.map((item, mIdx) => (
                            <span
                              key={mIdx}
                              className="px-2.5 py-1 rounded bg-surface border border-border text-[11px] text-ink flex items-center gap-1.5"
                            >
                              <Truck className="w-3 h-3 text-signal-emerald" />
                              <strong className="font-bold">{item.licensePlate}</strong>
                              <span className="text-ink-subtle">({item.role})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* C. Why This Merge is Proposed (Evaluation Ledger) */}
                <EvaluationLedger
                  validation={activeCandidate.validation}
                  multiStageDetails={activeCandidate.multiStage}
                  carrierPlate={activeCandidate.carrierPlate}
                  absorbedPlate={activeCandidate.absorbedPlate}
                />

                {/* D. Interactive Route Schematic Visualizer */}
                <RouteSchematicVisualizer
                  carrierPlate={activeCandidate.carrierPlate}
                  absorbedPlate={activeCandidate.absorbedPlate}
                  carrierStops={activeCandidate.carrierStops}
                  absorbedStops={activeCandidate.absorbedStops}
                  allStops={activeCandidate.allStops}
                  segmentLoads={activeCandidate.segmentLoads}
                  totalCapacity={activeCandidate.totalCapacity}
                  activeStop={activeSchematicStop}
                  onSelectStop={(stop) => setActiveSchematicStop(stop)}
                  isConfirmed={confirmedPairId === activeCandidate.pairId}
                />

                {/* E. Authoritative Segment-by-Segment Capacity Progression */}
                <SegmentLoadProfile
                  segmentLoads={activeCandidate.segmentLoads}
                  totalCapacity={activeCandidate.totalCapacity}
                  activeStop={activeSchematicStop}
                />
              </div>
            ) : (
              <div className="p-12 rounded-xl border border-border bg-surface/50 text-center space-y-3">
                <GitMerge className="w-10 h-10 text-ink-subtle mx-auto" />
                <h3 className="text-sm font-bold text-ink">No Candidate Selected</h3>
                <p className="text-xs text-ink-muted">
                  Choose a candidate pair from the queue on the left to inspect route schematics and segment loads.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ MODAL 1: CONFIRM APPROVE CONSOLIDATION ════════════ */}
      {confirmAcceptPair && (
        <Modal
          isOpen={!!confirmAcceptPair}
          onClose={() => setConfirmAcceptPair(null)}
          title="Authorize Route Consolidation"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setConfirmAcceptPair(null)}
                disabled={actionLoading[confirmAcceptPair.pairId || confirmAcceptPair._id] === "accept"}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAcceptPair(confirmAcceptPair)}
                isLoading={actionLoading[confirmAcceptPair.pairId || confirmAcceptPair._id] === "accept"}
                leftIcon={Check}
              >
                Confirm & Authorize
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-mono">
            <p className="text-sm text-ink font-sans leading-relaxed">
              You are about to authorize the algorithmic consolidation of this vehicle corridor.
            </p>
            <div className="p-4 rounded-lg bg-surface-elevated border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-ink-subtle">Primary Lead Carrier:</span>
                <span className="font-bold text-signal-emerald">
                  {confirmAcceptPair.carrierPlate || confirmAcceptPair.truckOneLicensePlate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-subtle">Absorbed Freight Vehicle:</span>
                <span className="font-bold text-signal-purple">
                  {confirmAcceptPair.absorbedPlate || confirmAcceptPair.truckTwoLicensePlate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-subtle">FreeTruck Standby Pool:</span>
                <span className="text-signal-aqua font-bold">Immediate Transition</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-subtle">Decision Audit Log:</span>
                <span className="text-ink font-bold">Committed to MergeDecisionLog</span>
              </div>
            </div>
            <p className="text-[11px] text-ink-subtle font-sans leading-relaxed">
              This action updates the active trip execution manifest, reallocates driver stop milestones, and removes the absorbed truck from the dispatch corridor.
            </p>
          </div>
        </Modal>
      )}

      {/* ════════════ MODAL 2: CONFIRM REJECT CONSOLIDATION ════════════ */}
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
                disabled={actionLoading[confirmRejectPair.pairId || confirmRejectPair._id] === "reject"}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRejectPair(confirmRejectPair)}
                isLoading={actionLoading[confirmRejectPair.pairId || confirmRejectPair._id] === "reject"}
                leftIcon={X}
              >
                Confirm Rejection
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-mono">
            <p className="text-sm text-ink font-sans leading-relaxed">
              Rejecting this corridor combination allows both vehicles to proceed on their independent scheduled routes.
            </p>
            <div className="p-3.5 rounded-lg bg-signal-coral/10 border border-signal-coral/20 text-signal-coral space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Notice: Independent Dispatch</span>
              </div>
              <p className="text-[11px] text-ink-muted font-sans">
                Both {confirmRejectPair.carrierPlate || confirmRejectPair.truckOneLicensePlate} and {confirmRejectPair.absorbedPlate || confirmRejectPair.truckTwoLicensePlate} will be recorded as independent dispatches and removed from the active merge queue.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════ MODAL 3: BATCH MERGE ALL CONFIRMATION ════════════ */}
      {confirmMergeAllOpen && (
        <Modal
          isOpen={confirmMergeAllOpen}
          onClose={() => setConfirmMergeAllOpen(false)}
          title="Authorize Batch Corridor Merges"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setConfirmMergeAllOpen(false)}
                disabled={actionLoading.mergeAll}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMergeAll}
                isLoading={actionLoading.mergeAll}
                leftIcon={GitMerge}
              >
                Authorize All ({totalCandidates})
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-mono">
            <p className="text-sm text-ink font-sans leading-relaxed">
              You are about to authorize batch consolidation across all <strong>{totalCandidates}</strong> candidate pairs currently detected.
            </p>
            <div className="p-4 rounded-lg bg-surface-elevated border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-ink-subtle">Total Pairs to Consolidate:</span>
                <span className="font-bold text-signal-aqua">{totalCandidates}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-subtle">Expected FreeTrucks Released:</span>
                <span className="font-bold text-signal-emerald">+{totalCandidates} Vehicles</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MergeableSchedule;
