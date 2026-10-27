import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useToast } from "../components/ui/Toast";
import { BASE_URL } from "../utils/constants";
import { calculateRequiredCapacity } from "../utils/capacityCalculation";
import {
  Truck,
  GitMerge,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  RotateCcw,
  Boxes,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  PackageCheck
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
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "../components/ui/Table";
import Pagination from "./Pagination";

const MergedSchedule = () => {
  const [mergedSchedule, setMergedSchedule] = useState([]);
  const [acceptedTraders, setAcceptedTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("consolidated"); // "consolidated" | "independent" | "traders"
  const [expandedRows, setExpandedRows] = useState({});

  const [currentPageAccepted, setCurrentPageAccepted] = useState(1);
  const [currentPageRejected, setCurrentPageRejected] = useState(1);
  const [currentPageTraders, setCurrentPageTraders] = useState(1);
  const itemsPerPage = 6;

  // Live stop execution & POD modal state
  const [selectedTripStops, setSelectedTripStops] = useState(null);
  const [isStopsModalOpen, setIsStopsModalOpen] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopsError, setStopsError] = useState("");

  // Trader shipment live tracking modal state
  const [selectedTraderTracking, setSelectedTraderTracking] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const toggleRowExpanded = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleViewTripStops = async (tripId) => {
    try {
      setIsStopsModalOpen(true);
      setLoadingStops(true);
      setStopsError("");
      const res = await axios.get(`${BASE_URL}/admin/trip-stops/${tripId}`, { withCredentials: true });
      setSelectedTripStops(res.data);
    } catch (err) {
      setStopsError(err.response?.data?.message || err.message || "Failed to load live stops.");
    } finally {
      setLoadingStops(false);
    }
  };

  const handleViewTraderTracking = async (traderRequestId) => {
    try {
      setIsTrackingModalOpen(true);
      setLoadingTracking(true);
      setTrackingError("");
      const res = await axios.get(`${BASE_URL}/trader/shipment-status/${traderRequestId}`, { withCredentials: true });
      setSelectedTraderTracking(res.data);
    } catch (err) {
      setTrackingError(err.response?.data?.message || err.message || "Failed to track cargo.");
    } finally {
      setLoadingTracking(false);
    }
  };

  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = useSelector((store) => store.user);
  const isCompany = !user?.emailId?.endsWith("@cargoxpress.com") && user?.registrationNumber !== undefined;
  const isTrader = !user?.emailId?.endsWith("@cargoxpress.com") && user?.aadharNumber !== undefined;

  const fetchMergedSchedule = useCallback(async () => {
    if (isCompany || isTrader) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(BASE_URL + "/mergedSchedule", { withCredentials: true });
      setMergedSchedule(res.data.mergedSchedules || []);
      setAcceptedTraders(res.data.acceptedTraders || []);
    } catch (err) {
      console.error("Error fetching merged schedule:", err);
      setError(err.response?.data?.message || err.message || "Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  }, [isCompany, isTrader]);

  useEffect(() => {
    if (user && isCompany) {
      showToast("neutral", "Access Restricted", "Consolidated manifests and merge schedules are managed by dispatch administration.");
      navigate("/company", { replace: true });
      return;
    }
    if (user && isTrader) {
      showToast("neutral", "Access Restricted", "Consolidated dispatches and merge schedules are managed by dispatch administration.");
      navigate("/trader", { replace: true });
      return;
    }
    if (!isCompany && !isTrader) {
      fetchMergedSchedule();
    }
  }, [user, isCompany, isTrader, navigate, fetchMergedSchedule, showToast]);

  if (isCompany || isTrader) {
    return null;
  }

  const accepted = mergedSchedule.filter((s) => s.status !== "rejected");
  const rejected = mergedSchedule.filter((s) => s.status === "rejected");

  // Search filtering
  const filterList = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((item) => {
      const plate = (item.transportationTruckLicensePlate || item.truckLicensePlate || "").toLowerCase();
      const source = (item.finalSource || item.source || "").toLowerCase();
      const dest = (item.finalDestination || item.destination || "").toLowerCase();
      const stops = (item.stops || []).join(" ").toLowerCase();
      const trader = (item.traderId?.name || "").toLowerCase();
      return plate.includes(q) || source.includes(q) || dest.includes(q) || stops.includes(q) || trader.includes(q);
    });
  };

  const filteredAccepted = filterList(accepted);
  const filteredRejected = filterList(rejected);
  const filteredTraders = filterList(acceptedTraders);

  const paginatedAccepted = filteredAccepted.slice(
    (currentPageAccepted - 1) * itemsPerPage,
    currentPageAccepted * itemsPerPage
  );
  const paginatedRejected = filteredRejected.slice(
    (currentPageRejected - 1) * itemsPerPage,
    currentPageRejected * itemsPerPage
  );
  const paginatedTraders = filteredTraders.slice(
    (currentPageTraders - 1) * itemsPerPage,
    currentPageTraders * itemsPerPage
  );

  const getStopStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <Badge variant="emerald" size="sm" dot>Completed</Badge>;
      case "in_progress":
      case "arrived":
      case "en_route":
        return <Badge variant="aqua" size="sm" dot>En Route</Badge>;
      case "failed":
        return <Badge variant="coral" size="sm" dot>Failed Attempt</Badge>;
      case "pending":
      default:
        return <Badge variant="neutral" size="sm">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Cohesive Shared Page Header */}
      <PageHeader
        eyebrow="Algorithmic Dispatch Operations"
        title="Consolidated Carrier Manifests"
        description="Monitor multi-stop consolidated freight corridors, absorbed vehicle capacity offloading, and real-time delivery milestone execution."
        badge={<Badge variant="aqua" dot>Live Operations</Badge>}
        breadcrumbs={[
          { label: "Dispatch", href: "/admin" },
          { label: "Consolidated Manifests" },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchMergedSchedule}
            isLoading={loading}
            leftIcon={RefreshCw}
          >
            Refresh Manifests
          </Button>
        }
      />

      {/* Error State */}
      {error && (
        <ErrorPanel
          title="Schedule Load Error"
          message={error}
          onRetry={fetchMergedSchedule}
        />
      )}

      {/* 2. Key Metrics Strip (CE-Style Restrained Stat Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Consolidated Manifests"
          value={accepted.length}
          unit="Active Corridors"
          subtitle="Multi-stop merged freight carriers"
          change="Optimized"
          changeType="positive"
        />
        <StatCard
          label="Independent Dispatches"
          value={rejected.length}
          unit="Direct Trucks"
          subtitle="Non-merged standalone vehicles"
          change="Standard"
          changeType="neutral"
        />
        <StatCard
          label="Consolidated Trader Cargo"
          value={acceptedTraders.length}
          unit="Consignments"
          subtitle="Trader loads merged onto carrier routes"
          change="Multi-Consignor"
          changeType="positive"
        />
      </div>

      {/* 3. Segmented Navigation Tabs & Search Toolbar */}
      <div className="space-y-4 pt-2 border-t border-border">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter Controls */}
          <div className="inline-flex items-center p-1 rounded-md bg-surface-elevated border border-border shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("consolidated")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "consolidated"
                  ? "bg-surface text-signal-aqua border border-border shadow-sm font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Consolidated Manifests</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {accepted.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("independent")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "independent"
                  ? "bg-surface text-signal-amber border border-border shadow-sm font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Independent Dispatches</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {rejected.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("traders")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "traders"
                  ? "bg-surface text-signal-emerald border border-border shadow-sm font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Trader Cargo</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {acceptedTraders.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="max-w-xs w-full">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search plate, corridor, stop, or consignor..."
            />
          </div>
        </div>

        {/* ════════════ TAB 1: CONSOLIDATED CARRIER MANIFESTS ════════════ */}
        {activeTab === "consolidated" && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : paginatedAccepted.length > 0 ? (
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Primary Carrier</TableHead>
                      <TableHead>Corridor Route Pipeline</TableHead>
                      <TableHead>Capacity Utilization</TableHead>
                      <TableHead>Absorbed Fleet</TableHead>
                      <TableHead align="right">Operational Manifest</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccepted.map((schedule, idx) => {
                      const rowId = schedule._id || idx;
                      const isExpanded = Boolean(expandedRows[rowId]);
                      const cap = schedule.totalCapacity || 1;
                      const maxLoad = Array.isArray(schedule.finalCurrentLoad) && schedule.finalCurrentLoad.length > 0
                        ? Math.max(...schedule.finalCurrentLoad)
                        : 0;
                      const utilPct = Math.min(100, Math.round((maxLoad / cap) * 100));
                      const stopsList = schedule.stops || [];

                      return (
                        <React.Fragment key={rowId}>
                          <TableRow hover className="group">
                            {/* Expand Row Toggle */}
                            <TableCell className="text-center">
                              <button
                                type="button"
                                onClick={() => toggleRowExpanded(rowId)}
                                className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-white/5 transition-colors"
                                title={isExpanded ? "Collapse stops breakdown" : "Expand stops breakdown"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-signal-aqua" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-ink-subtle" />
                                )}
                              </button>
                            </TableCell>

                            {/* Plate & Status */}
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-mono text-xs sm:text-sm font-semibold text-ink">
                                  {schedule.transportationTruckLicensePlate}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="aqua" size="sm" dot>
                                    Lead Carrier
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>

                            {/* Corridor Pipeline */}
                            <TableCell>
                              <div className="flex flex-col gap-1 min-w-[200px]">
                                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-ink flex-wrap">
                                  <span className="text-ink">{schedule.finalSource}</span>
                                  <span className="text-ink-subtle">→</span>
                                  <span className="text-ink">{schedule.finalDestination}</span>
                                </div>
                                <span className="text-[11px] font-mono text-ink-subtle">
                                  {stopsList.length} total scheduled stops
                                </span>
                              </div>
                            </TableCell>

                            {/* Capacity Utilization Progress Bar */}
                            <TableCell isNumeric>
                              <div className="flex flex-col gap-1.5 min-w-[150px]">
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="text-ink-subtle text-[11px]">Payload</span>
                                  <span className="font-semibold text-ink">{utilPct}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden border border-border">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      utilPct > 90
                                        ? "bg-signal-coral"
                                        : utilPct > 70
                                        ? "bg-signal-emerald"
                                        : "bg-signal-aqua"
                                    }`}
                                    style={{ width: `${utilPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-ink-subtle">
                                  {maxLoad.toLocaleString()} / {cap.toLocaleString()} kg
                                </span>
                              </div>
                            </TableCell>

                            {/* Absorbed Fleet */}
                            <TableCell>
                              {schedule.mergedFromTrucks && schedule.mergedFromTrucks.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {schedule.mergedFromTrucks.map((mTruck, mIdx) => (
                                    <span
                                      key={mIdx}
                                      className="px-2 py-0.5 rounded bg-surface-elevated border border-border font-mono text-[10.5px] text-ink-secondary flex items-center gap-1"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5 text-signal-purple" />
                                      {mTruck.licensePlate}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-ink-subtle font-mono text-[11px]">
                                  Single Carrier
                                </span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleViewTripStops(schedule._id)}
                                leftIcon={Eye}
                              >
                                Live Stops
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expandable Corridor Drawer */}
                          {isExpanded && (
                            <TableRow className="bg-surface-subtle/40 border-b border-border/80">
                              <TableCell colSpan={6} className="p-4 sm:p-5">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="cx-eyebrow text-ink-muted">
                                      Itinerary Waypoint Progression & Segment Payload
                                    </span>
                                    <span className="font-mono text-[11px] text-ink-subtle">
                                      {schedule.stops?.length || 0} Stops Recorded
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                                    {(schedule.stops || []).map((stop, sIdx) => {
                                      const curLoad = schedule.finalCurrentLoad?.[sIdx] ?? 0;
                                      const remLoad = schedule.finalRemainingLoad?.[sIdx] ?? Math.max(0, cap - curLoad);

                                      return (
                                        <div
                                          key={sIdx}
                                          className="p-3 rounded-md bg-surface-elevated border border-border flex flex-col gap-1.5"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-4 h-4 rounded-full bg-signal-aqua/10 border border-signal-aqua/30 text-signal-aqua font-mono font-bold text-[10px] flex items-center justify-center">
                                                {sIdx + 1}
                                              </span>
                                              <span className="font-semibold text-xs text-ink">{stop}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] font-mono text-ink-subtle border-t border-border/40 pt-1">
                                            <span>Load: <strong className="text-ink">{curLoad.toLocaleString()} kg</strong></span>
                                            <span>Headroom: {remLoad.toLocaleString()} kg</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>

                {filteredAccepted.length > itemsPerPage && (
                  <div className="flex justify-center pt-2">
                    <Pagination
                      currentPage={currentPageAccepted}
                      totalPages={Math.ceil(filteredAccepted.length / itemsPerPage)}
                      onPageChange={(page) => setCurrentPageAccepted(page)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No Consolidated Schedules"
                description={
                  searchQuery
                    ? `No manifests matched search query "${searchQuery}".`
                    : "No approved consolidated carrier schedules exist in dispatch. Use Route Optimization to review merge candidates."
                }
              />
            )}
          </div>
        )}

        {/* ════════════ TAB 2: INDEPENDENT DISPATCHES ════════════ */}
        {activeTab === "independent" && (
          <div className="space-y-4">
            {paginatedRejected.length > 0 ? (
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Vehicle Plate</TableHead>
                      <TableHead>Corridor Origin → Destination</TableHead>
                      <TableHead>Waypoints</TableHead>
                      <TableHead>Dispatch Status</TableHead>
                      <TableHead align="right">Actions</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {paginatedRejected.map((schedule, idx) => (
                      <TableRow key={schedule._id || idx} hover>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-signal-amber" />
                            <span className="font-mono text-xs sm:text-sm font-semibold text-ink">
                              {schedule.transportationTruckLicensePlate}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono font-medium text-ink">
                            <span>{schedule.finalSource}</span>
                            <span className="text-ink-subtle mx-1.5">→</span>
                            <span>{schedule.finalDestination}</span>
                          </div>
                        </TableCell>
                        <TableCell isNumeric>
                          <span className="font-mono text-xs text-ink-subtle">
                            {schedule.stops?.length || 0} stops
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="amber" size="sm">Independent Dispatch</Badge>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewTripStops(schedule._id)}
                            leftIcon={Eye}
                          >
                            Inspect Stops
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredRejected.length > itemsPerPage && (
                  <div className="flex justify-center pt-2">
                    <Pagination
                      currentPage={currentPageRejected}
                      totalPages={Math.ceil(filteredRejected.length / itemsPerPage)}
                      onPageChange={(page) => setCurrentPageRejected(page)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Truck}
                title="No Independent Dispatches"
                description="All operational vehicles in the dispatch network are currently consolidated or awaiting route assignment."
              />
            )}
          </div>
        )}

        {/* ════════════ TAB 3: CONSOLIDATED TRADER CARGO ════════════ */}
        {activeTab === "traders" && (
          <div className="space-y-4">
            {paginatedTraders.length > 0 ? (
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Consignor Trader</TableHead>
                      <TableHead>Corridor Route</TableHead>
                      <TableHead>Assigned Carrier Truck</TableHead>
                      <TableHead>Required Capacity</TableHead>
                      <TableHead>Consolidation Status</TableHead>
                      <TableHead align="right">Shipment Progress</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {paginatedTraders.map((trader, idx) => (
                      <TableRow key={trader._id || idx} hover>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-signal-emerald" />
                            <span className="font-semibold text-xs sm:text-sm text-ink">
                              {trader.traderId?.name || "Consignor Trader"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-mono font-medium text-ink">
                            <span>{trader.source}</span>
                            <span className="text-ink-subtle mx-1.5">→</span>
                            <span>{trader.destination}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-signal-aqua">
                            {trader.truckLicensePlate || "Pending Vehicle"}
                          </span>
                        </TableCell>
                        <TableCell isNumeric>
                          <span className="font-mono text-xs font-medium text-ink">
                            {(trader.requiredCapacity || calculateRequiredCapacity(trader.load))?.toLocaleString()} kg
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="emerald" size="sm" dot>Consolidated</Badge>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewTraderTracking(trader.traderRequestId)}
                            rightIcon={ArrowRight}
                          >
                            Track Cargo
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredTraders.length > itemsPerPage && (
                  <div className="flex justify-center pt-2">
                    <Pagination
                      currentPage={currentPageTraders}
                      totalPages={Math.ceil(filteredTraders.length / itemsPerPage)}
                      onPageChange={(page) => setCurrentPageTraders(page)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Boxes}
                title="No Trader Cargo Merged"
                description="No trader cargo shipments are currently consolidated. Review Trader Merge Pool to merge pending consignments."
              />
            )}
          </div>
        )}
      </div>

      {/* ════════════ MODAL 1: LIVE TRIP EXECUTION & STOP TIMELINE ════════════ */}
      <Modal
        isOpen={isStopsModalOpen}
        onClose={() => {
          setIsStopsModalOpen(false);
          setSelectedTripStops(null);
          setStopsError("");
        }}
        title="Live Stop Execution & Delivery Manifest"
        description="Chronological delivery milestones, arrival timestamps, and consignment status along the active corridor."
        size="lg"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setIsStopsModalOpen(false);
              setSelectedTripStops(null);
              setStopsError("");
            }}
          >
            Close Manifest
          </Button>
        }
      >
        {loadingStops ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-signal-aqua" />
            <p className="text-xs text-ink-muted">Retrieving live stop execution manifest from carrier telemetry...</p>
          </div>
        ) : stopsError ? (
          <ErrorPanel
            title="Telemetry Unavailable"
            message={stopsError}
            onRetry={() => selectedTripStops?._id && handleViewTripStops(selectedTripStops._id)}
          />
        ) : selectedTripStops ? (
          <div className="space-y-5 text-xs">
            {/* Header info */}
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">Carrier Truck</span>
                <span className="font-mono font-semibold text-sm text-signal-aqua">
                  {selectedTripStops.carrierTruckLicensePlate || "Carrier Vehicle"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">Assigned Driver</span>
                <span className="font-medium text-ink text-xs sm:text-sm">
                  {selectedTripStops.driverName || "Driver Assigned"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">Corridor Status</span>
                <span className="font-mono text-xs font-semibold text-signal-emerald capitalize">
                  {selectedTripStops.status?.replace(/_/g, " ") || "In Progress"}
                </span>
              </div>
            </div>

            {/* Vertical ordered stop timeline */}
            <div className="space-y-3">
              <span className="cx-eyebrow text-ink-muted">
                Ordered Stops Execution Sequence ({selectedTripStops.stops?.length || 0})
              </span>

              <div className="relative pl-6 space-y-3 border-l border-border ml-2">
                {(selectedTripStops.stops || []).map((stop, sIdx) => {
                  const isCompleted = stop.status === "completed";
                  const isFailed = stop.status === "failed";
                  const isInProgress = ["in_progress", "arrived", "en_route"].includes(stop.status);

                  return (
                    <div key={stop._id || sIdx} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[31px] top-1 w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[9px] font-bold ${
                          isCompleted
                            ? "bg-signal-emerald/20 border-signal-emerald text-signal-emerald"
                            : isFailed
                            ? "bg-signal-coral/20 border-signal-coral text-signal-coral"
                            : isInProgress
                            ? "bg-signal-aqua/20 border-signal-aqua text-signal-aqua animate-pulse"
                            : "bg-surface-elevated border-border text-ink-subtle"
                        }`}
                      >
                        {stop.stopIndex != null ? stop.stopIndex + 1 : sIdx + 1}
                      </div>

                      {/* Stop Content Box */}
                      <div className="p-3.5 rounded-lg bg-surface/70 border border-border space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-ink">{stop.stopName}</span>
                            <Badge
                              variant={stop.stopType === "pickup" ? "aqua" : "purple"}
                              size="sm"
                              className="font-mono text-[10px]"
                            >
                              {stop.stopType === "pickup" ? (
                                <span className="flex items-center gap-1">
                                  <PackagePlus className="w-3 h-3" />
                                  PICKUP
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <PackageCheck className="w-3 h-3" />
                                  DELIVERY
                                </span>
                              )}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-mono text-ink-subtle">Stop:</span>
                            {getStopStatusBadge(stop.status)}
                          </div>
                        </div>

                        {/* Timing info */}
                        <div className="flex items-center gap-4 text-[11px] text-ink-subtle font-mono">
                          {stop.arrivalAt && (
                            <span>Arrived: {new Date(stop.arrivalAt).toLocaleTimeString()}</span>
                          )}
                          {stop.completedAt && (
                            <span>Completed: {new Date(stop.completedAt).toLocaleTimeString()}</span>
                          )}
                        </div>

                        {/* Shipments handled at this stop */}
                        {stop.shipments && stop.shipments.length > 0 && (
                          <div className="pt-2 border-t border-border/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">
                                Handled Cargo Consignments ({stop.shipments.length})
                              </span>
                              <span className="text-[10px] font-mono text-ink-subtle">
                                Consignment Status vs Stop Execution
                              </span>
                            </div>

                            <div className="space-y-2">
                              {stop.shipments.map((ship, shipIdx) => {
                                const hasOutstanding = ship.outstandingWeightKg != null && ship.outstandingWeightKg > 0;
                                const isDelivered = ship.status === "delivered" || ship.status === "picked_up";
                                const isPartial = ship.status === "partial" || ship.status === "partially_delivered";
                                const isFailed = ship.status === "failed" || ship.status === "delivery_failed";

                                return (
                                  <div
                                    key={ship._id || shipIdx}
                                    className="p-2.5 rounded bg-surface-elevated border border-border space-y-1.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-ink font-mono text-[11px]">{ship.reference}</span>
                                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface text-ink-muted border border-border/60">
                                          {ship.operation === "pickup" ? "Load Pickup" : "Drop-off Delivery"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] uppercase font-mono text-ink-subtle">Shipment:</span>
                                        <Badge
                                          variant={
                                            isDelivered
                                              ? "emerald"
                                              : isPartial
                                              ? "amber"
                                              : isFailed
                                              ? "coral"
                                              : "neutral"
                                          }
                                          size="sm"
                                          dot
                                        >
                                          {ship.status?.replace(/_/g, " ")}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-subtle">
                                      <span>{ship.cargoDescription || "General Freight"} • Total: {ship.weightKg} kg</span>
                                      {ship.deliveredWeightKg != null && (
                                        <span className="text-signal-emerald font-semibold">
                                          Delivered: {ship.deliveredWeightKg} kg
                                        </span>
                                      )}
                                    </div>

                                    {/* Outstanding operations callout */}
                                    {hasOutstanding && (
                                      <div className="p-1.5 rounded bg-signal-amber/10 border border-signal-amber/20 flex items-center justify-between text-[11px] font-mono text-signal-amber">
                                        <span>Outstanding: <strong>{ship.outstandingWeightKg} kg</strong> remaining</span>
                                        {ship.deliveryAttempts && ship.deliveryAttempts.length > 0 && (
                                          <span className="text-[10px]">
                                            {ship.deliveryAttempts.length} attempt{ship.deliveryAttempts.length > 1 ? "s" : ""} recorded
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Failure callout if delivery failed */}
                                    {isFailed && ship.failureReason && (
                                      <div className="p-1.5 rounded bg-signal-coral/10 border border-signal-coral/20 text-signal-coral text-[11px]">
                                        <strong>Consignment Exception:</strong> {ship.failureReason}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Failure reason callout if stop failed */}
                        {stop.failureReason && (
                          <div className="p-2.5 rounded bg-signal-coral/10 border border-signal-coral/20 text-signal-coral text-xs">
                            <strong>Waypoint Stop Exception:</strong> {stop.failureReason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ════════════ MODAL 2: TRADER CARGO TRACKING ════════════ */}
      <Modal
        isOpen={isTrackingModalOpen}
        onClose={() => {
          setIsTrackingModalOpen(false);
          setSelectedTraderTracking(null);
          setTrackingError("");
        }}
        title="Consignor Cargo Tracking"
        description="Real-time freight transit progression and verification milestones."
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setIsTrackingModalOpen(false);
              setSelectedTraderTracking(null);
              setTrackingError("");
            }}
          >
            Close Tracking
          </Button>
        }
      >
        {loadingTracking ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-signal-emerald" />
            <p className="text-xs text-ink-muted">Tracking consignment transit telemetry...</p>
          </div>
        ) : trackingError ? (
          <ErrorPanel
            title="Tracking Unavailable"
            message={trackingError}
          />
        ) : selectedTraderTracking ? (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs sm:text-sm text-ink">
                  {selectedTraderTracking.source} → {selectedTraderTracking.destination}
                </span>
                <Badge variant="emerald" size="sm" dot>
                  {selectedTraderTracking.statusLabel || "In Progress"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-ink-subtle font-mono text-[11px] border-t border-border/40 pt-1.5">
                <span>Weight: <strong className="text-ink">{selectedTraderTracking.weightKg} kg</strong></span>
                <span>Carrier: <strong className="text-signal-aqua">{selectedTraderTracking.carrierTruckLicensePlate || "Assigned"}</strong></span>
              </div>
            </div>

            {/* Milestones list */}
            <div className="space-y-2">
              <span className="cx-eyebrow text-ink-muted">
                Milestone Verification History
              </span>
              <div className="space-y-2">
                {(selectedTraderTracking.milestones || []).map((m, mIdx) => (
                  <div key={mIdx} className="p-2.5 rounded-lg bg-surface border border-border flex items-center gap-3">
                    {m.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-signal-emerald shrink-0" />
                    ) : m.error ? (
                      <XCircle className="w-4 h-4 text-signal-coral shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-ink-subtle shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-ink">{m.event}</p>
                      {m.location && <p className="text-[11px] text-ink-subtle font-mono">{m.location}</p>}
                    </div>
                    {m.timestamp && (
                      <span className="font-mono text-[10px] text-ink-subtle">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default MergedSchedule;
