import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  GitMerge,
  CalendarClock,
  Boxes,
  RefreshCw,
  ArrowRight,
  RotateCcw,
  Building2,
  Users,
  ChevronRight
} from "lucide-react";
import { BASE_URL } from "../utils/constants";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import { CardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorPanel from "../components/ui/ErrorPanel";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "../components/ui/Table";

const AdminDashboard = () => {
  const [fleetOverview, setFleetOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("corridors"); // "corridors" | "queue" | "freeTrucks" | "companies"

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, compRes, traderRes] = await Promise.all([
        axios.get(BASE_URL + "/admin/fleet-overview", { withCredentials: true }),
        axios.get(BASE_URL + "/viewCompany", { withCredentials: true }),
        axios.get(BASE_URL + "/viewTrader", { withCredentials: true }),
      ]);

      setFleetOverview(overviewRes.data);

      const compData = Array.isArray(compRes.data) ? compRes.data : [];
      setCompanies(compData.length > 1 ? compData.slice(1) : compData);

      const traderData = Array.isArray(traderRes.data) ? traderRes.data : [];
      setTraders(traderData);
    } catch (err) {
      console.error("Admin dashboard data fetch failed:", err);
      setError(err.response?.data?.message || err.message || "Failed to load operational fleet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const metrics = fleetOverview?.metrics || {
    totalRegisteredTrucks: 0,
    activeTrucksCount: 0,
    freeTruckPoolCount: 0,
    pendingMergeOffersCount: 0,
    activeConsolidatedSchedulesCount: 0,
    pendingTraderRequestsCount: 0,
    completedDeliveries: 0,
    delayedOrFailedDeliveries: 0,
    inProgressStops: 0,
    overallUtilizationPct: 0,
  };

  const scheduleUtilization = fleetOverview?.scheduleUtilization || [];
  const pendingTraderRequests = fleetOverview?.pendingTraderRequests || [];
  const freeTrucks = fleetOverview?.freeTrucks || [];
  const recentDecisions = fleetOverview?.recentDecisions || [];

  // Filter schedules
  const filteredSchedules = scheduleUtilization.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.carrierPlate && s.carrierPlate.toLowerCase().includes(q)) ||
      (s.source && s.source.toLowerCase().includes(q)) ||
      (s.destination && s.destination.toLowerCase().includes(q))
    );
  });

  // Filter pending trader queue
  const filteredQueue = pendingTraderRequests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.source && r.source.toLowerCase().includes(q)) ||
      (r.destination && r.destination.toLowerCase().includes(q)) ||
      (r.traderId?.name && r.traderId.name.toLowerCase().includes(q))
    );
  });

  // Filter companies
  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.registrationNumber && c.registrationNumber.toLowerCase().includes(q)) ||
      (c.emailId && c.emailId.toLowerCase().includes(q))
    );
  });

  // Filter traders
  const filteredTraders = traders.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.emailId && t.emailId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header with live status & operational dispatch shortcuts */}
      <PageHeader
        eyebrow="Central Dispatch Command"
        title="Network Fleet Operations & Optimization"
        description="Monitor network capacity utilization, review algorithmic route consolidation queues, and manage platform vehicle registries."
        badge={<Badge variant="aqua" dot>Dispatch Active</Badge>}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Dispatch Command" },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDashboardData}
              isLoading={loading}
              leftIcon={RefreshCw}
            >
              Refresh Data
            </Button>
            <Link to="/mergeable">
              <Button variant="primary" size="sm" rightIcon={ArrowRight}>
                Route Optimization
              </Button>
            </Link>
          </div>
        }
      />

      {/* Error state if failed */}
      {error && (
        <ErrorPanel
          title="Fleet Operations Telemetry Error"
          message={error}
          onRetry={fetchDashboardData}
        />
      )}

      {/* 2. Priority Decision Alert Banner (When algorithmic merge opportunities exist) */}
      {metrics.pendingMergeOffersCount > 0 && (
        <div className="p-4 rounded-lg bg-surface-elevated border border-signal-aqua/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-signal-aqua/10 border border-signal-aqua/20 flex items-center justify-center text-signal-aqua shrink-0">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-ink">
                  {metrics.pendingMergeOffersCount} Compatible Route Pairs Awaiting Review
                </span>
                <Badge variant="aqua" size="sm">Action Required</Badge>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                The load consolidation engine detected mergeable carrier routes with compatible delivery corridors.
              </p>
            </div>
          </div>
          <Link to="/mergeable">
            <Button variant="aqua" size="sm" rightIcon={ArrowRight}>
              Review Opportunities
            </Button>
          </Link>
        </div>
      )}

      {/* 3. Executive Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Pending Merge Pairs"
          value={metrics.pendingMergeOffersCount}
          unit="Pairs"
          subtitle="Algorithmically paired routes"
          change={metrics.pendingMergeOffersCount > 0 ? "Review Required" : "Optimized"}
          changeType={metrics.pendingMergeOffersCount > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Operating Fleet"
          value={metrics.activeTrucksCount}
          unit={`/ ${metrics.totalRegisteredTrucks} Vehicles`}
          subtitle="Vehicles deployed on network"
          change={`${metrics.freeTruckPoolCount} in Free Pool`}
          changeType="neutral"
        />
        <StatCard
          label="Consolidated Schedules"
          value={metrics.activeConsolidatedSchedulesCount}
          unit="Corridors"
          subtitle="Approved multi-stop manifests"
          change="Live Carriers"
          changeType="positive"
        />
        <StatCard
          label="Exceptions & En Route"
          value={metrics.delayedOrFailedDeliveries}
          unit="Exceptions"
          subtitle={`${metrics.inProgressStops} stops currently en route`}
          change={metrics.delayedOrFailedDeliveries > 0 ? "Inspect Delays" : "No Critical Delays"}
          changeType={metrics.delayedOrFailedDeliveries > 0 ? "negative" : "positive"}
        />
      </div>

      {/* 4. Authorized Operational Dispatch Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/mergeable"
          className="p-3.5 rounded-lg bg-surface/70 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-surface-elevated border border-border flex items-center justify-center text-signal-aqua group-hover:border-signal-aqua/40 transition-colors">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm text-ink block">Route Optimization</span>
              <span className="text-[11px] text-ink-subtle block font-mono">
                {metrics.pendingMergeOffersCount} pending pairs
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/mergedSchedule"
          className="p-3.5 rounded-lg bg-surface/70 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-surface-elevated border border-border flex items-center justify-center text-signal-emerald group-hover:border-signal-emerald/40 transition-colors">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm text-ink block">Approved Schedules</span>
              <span className="text-[11px] text-ink-subtle block font-mono">
                {metrics.activeConsolidatedSchedulesCount} active manifests
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/mergeableTraders"
          className="p-3.5 rounded-lg bg-surface/70 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-surface-elevated border border-border flex items-center justify-center text-signal-purple group-hover:border-signal-purple/40 transition-colors">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm text-ink block">Trader Merge Pool</span>
              <span className="text-[11px] text-ink-subtle block font-mono">
                {metrics.pendingTraderRequestsCount} requests in queue
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 5. Workstation Tabs & High-Density Tables */}
      <div className="space-y-4 pt-2 border-t border-border">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="inline-flex items-center p-1 rounded-md bg-surface-elevated border border-border shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("corridors")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "corridors"
                  ? "bg-surface text-signal-aqua border border-border font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Active Corridors</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {scheduleUtilization.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "queue"
                  ? "bg-surface text-signal-purple border border-border font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Consignments Queue</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {pendingTraderRequests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("freeTrucks")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "freeTrucks"
                  ? "bg-surface text-signal-emerald border border-border font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>FreeTruck Pool</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {freeTrucks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("companies")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "companies"
                  ? "bg-surface text-ink border border-border font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Carriers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {companies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("traders")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                activeTab === "traders"
                  ? "bg-surface text-ink border border-border font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Consignors</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                {traders.length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="max-w-xs w-full">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search plate, corridor, or carrier..."
            />
          </div>
        </div>

        {/* Tab 1: Active Corridors Table */}
        {activeTab === "corridors" && (
          <div className="space-y-4">
            {loading ? (
              <CardSkeleton />
            ) : filteredSchedules.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Lead Carrier</TableHead>
                    <TableHead>Corridor Route</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Capacity Utilization</TableHead>
                    <TableHead>Absorbed Trucks</TableHead>
                    <TableHead align="right">Manifest</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <span className="font-mono text-xs sm:text-sm font-semibold text-ink">
                          {s.carrierPlate}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono font-medium text-ink">
                          <span>{s.source}</span>
                          <span className="text-ink-subtle mx-1.5">→</span>
                          <span>{s.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="font-mono text-xs text-ink-subtle">
                          {s.stopsCount} stops
                        </span>
                      </TableCell>
                      <TableCell isNumeric>
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-ink-subtle">{s.peakLoad.toLocaleString()} kg</span>
                            <span className="font-semibold text-ink">{s.utilizationPct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden border border-border">
                            <div
                              className="h-full rounded-full bg-signal-aqua"
                              style={{ width: `${s.utilizationPct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-signal-purple">
                          {s.mergedTrucksCount} absorbed
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <Link to="/mergedSchedule">
                          <Button variant="secondary" size="xs">
                            View Manifest
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No Active Corridors Found"
                description={
                  searchQuery
                    ? `No active corridors matching "${searchQuery}".`
                    : "No consolidated carrier schedules are currently active. Review pending opportunities in Route Optimization."
                }
              />
            )}
          </div>
        )}

        {/* Tab 2: Pending Consignments Queue Table */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            {filteredQueue.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Consignor Trader</TableHead>
                    <TableHead>Corridor Origin → Destination</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Required Payload</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead align="right">Action</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredQueue.map((req) => (
                    <TableRow key={req._id} hover>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-ink">
                            {req.traderId?.name || "Consignor Trader"}
                          </span>
                          <span className="text-[11px] font-mono text-ink-subtle">
                            {req.traderId?.emailId || "Private"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono font-medium text-ink">
                          <span>{req.source}</span>
                          <span className="text-ink-subtle mx-1.5">→</span>
                          <span>{req.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="font-mono text-xs text-ink-subtle">
                          {(req.stops || []).length} stops
                        </span>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="font-mono text-xs font-medium text-ink">
                          {(req.requiredCapacity || (Array.isArray(req.load) ? req.load[0] : req.load))?.toLocaleString()} kg
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-mono text-ink-subtle">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <Link to="/mergeableTraders">
                          <Button variant="secondary" size="xs" rightIcon={ArrowRight}>
                            Pair Load
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Boxes}
                title="Consignments Queue Empty"
                description="There are currently no unprocessed consignor shipment requests awaiting vehicle consolidation."
              />
            )}
          </div>
        )}

        {/* Tab 3: FreeTruck Pool Table */}
        {activeTab === "freeTrucks" && (
          <div className="space-y-4">
            {freeTrucks.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Rated Capacity</TableHead>
                    <TableHead>Pool Status</TableHead>
                    <TableHead>Freed Timestamp</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {freeTrucks.map((ft) => (
                    <TableRow key={ft._id} hover>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-3.5 h-3.5 text-signal-purple" />
                          <span className="font-mono text-xs sm:text-sm font-semibold text-ink">
                            {ft.licensePlate || "Vehicle"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="font-mono text-xs font-medium text-ink">
                          {ft.totalCapacity?.toLocaleString() || "Standard"} kg
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="purple" size="sm" dot>Available in Free Pool</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] text-ink-subtle">
                          {ft.createdAt ? new Date(ft.createdAt).toLocaleString() : "Active"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={RotateCcw}
                title="No Vehicles in Free Pool"
                description="Vehicles are absorbed into the free pool when their schedules are consolidated onto lead carriers."
              />
            )}
          </div>
        )}

        {/* Tab 4: Carrier Companies Directory */}
        {activeTab === "companies" && (
          <div className="space-y-4">
            {filteredCompanies.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Carrier Name</TableHead>
                    <TableHead>Registration Number</TableHead>
                    <TableHead>Dispatch Email</TableHead>
                    <TableHead>Operational Fleet</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((c) => (
                    <TableRow key={c._id} hover>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-signal-aqua" />
                          <span className="font-semibold text-xs sm:text-sm text-ink">
                            {c.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-ink-secondary">
                          {c.registrationNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-ink-subtle">
                          {c.emailId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">Registered Carrier</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Building2}
                title="No Carriers Found"
                description="No carrier transport companies registered matching your search."
              />
            )}
          </div>
        )}

        {/* Tab 5: Consignors (Traders) Directory */}
        {activeTab === "traders" && (
          <div className="space-y-4">
            {filteredTraders.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Consignor Name</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead align="right">Action</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredTraders.map((t) => (
                    <TableRow key={t._id} hover>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-signal-emerald" />
                          <span className="font-semibold text-xs sm:text-sm text-ink">
                            {t.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-ink-subtle">
                          {t.emailId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="emerald" size="sm" dot>Active Consignor</Badge>
                      </TableCell>
                      <TableCell align="right">
                        <Link to="/mergeableTraders">
                          <Button variant="ghost" size="xs" rightIcon={ArrowRight}>
                            View Requests
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Users}
                title="No Consignors Found"
                description="No consignor trader accounts registered matching your search query."
              />
            )}
          </div>
        )}
      </div>

      {/* 6. Recent Merge Decisions History (Real MergeDecisionLog Data) */}
      {recentDecisions.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="cx-eyebrow text-ink-muted">
              Recent Algorithmic Dispatch Decisions
            </span>
            <span className="font-mono text-[11px] text-ink-subtle">
              Audit Log ({recentDecisions.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentDecisions.slice(0, 6).map((d) => (
              <div
                key={d._id}
                className="p-3.5 rounded-lg bg-surface/70 border border-border flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">
                      {d.decision === "accepted" ? "Approved Merge" : "Rejected Offer"}
                    </span>
                    <Badge variant={d.decision === "accepted" ? "emerald" : "coral"} size="sm">
                      {d.decision}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-mono text-ink-subtle">
                    Carrier: <strong className="text-ink">{d.carrierLicensePlate}</strong> • Absorbed: {d.absorbedLicensePlate}
                  </p>
                  {d.reason && (
                    <p className="text-[11px] text-ink-muted italic">
                      &ldquo;{d.reason}&rdquo;
                    </p>
                  )}
                </div>
                <span className="font-mono text-[10px] text-ink-subtle shrink-0">
                  {new Date(d.decidedAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
