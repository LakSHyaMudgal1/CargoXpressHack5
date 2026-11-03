import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Truck,
  MapPin,
  Plus,
  RefreshCw,
  UserCheck
} from "lucide-react";
import { BASE_URL } from "../utils/constants";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import Modal from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorPanel from "../components/ui/ErrorPanel";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "../components/ui/Table";
import CorridorTimeline from "../components/ui/CorridorTimeline";

const CompanyDashboard = () => {
  const [fleetData, setFleetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "active" | "available" | "free"
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFleetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(BASE_URL + "/company/fleet", { withCredentials: true });
      setFleetData(res.data);
    } catch (err) {
      console.error("Company fleet fetch failed:", err);
      setError(err.response?.data?.message || err.message || "Failed to load company fleet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  const stats = fleetData?.stats || {
    totalTrucks: 0,
    availableTrucks: 0,
    activeAssignments: 0,
    activeTrips: 0,
    freeTrucksInPool: 0,
    overallUtilizationPct: 0,
    totalCapacityKg: 0,
    totalLoadedKg: 0,
  };

  const trucks = fleetData?.trucks || [];

  // Status counts
  const activeCount = trucks.filter((t) => t.operationalStatus === "active_assignment").length;
  const inPoolCount = trucks.filter((t) => t.isFreeInPool).length;

  // Filter trucks
  const filteredTrucks = trucks.filter((t) => {
    if (filterTab === "active" && t.operationalStatus !== "active_assignment") return false;
    if (filterTab === "available" && t.operationalStatus !== "available_unassigned" && t.operationalStatus !== "available_in_pool") return false;
    if (filterTab === "free" && !t.isFreeInPool) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const plateMatch = t.licensePlate && t.licensePlate.toLowerCase().includes(q);
    const sourceMatch = t.route?.source && t.route.source.toLowerCase().includes(q);
    const destMatch = t.route?.destination && t.route.destination.toLowerCase().includes(q);
    const driverMatch = t.assignment?.driverId?.name && t.assignment.driverId.name.toLowerCase().includes(q);

    return plateMatch || sourceMatch || destMatch || driverMatch;
  });

  const getOperationalStatusBadge = (truck) => {
    if (truck.isFreeInPool) {
      return <Badge variant="purple" size="sm" dot>In FreeTruck Pool</Badge>;
    }
    switch (truck.operationalStatus) {
      case "active_assignment":
        return <Badge variant="aqua" size="sm" dot>Active on Trip</Badge>;
      case "available_unassigned":
        return <Badge variant="emerald" size="sm">Available Standby</Badge>;
      case "assigned_awaiting_route":
        return <Badge variant="amber" size="sm">Awaiting Route</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Registered</Badge>;
    }
  };

  const remainingHeadroomKg = Math.max(0, stats.totalCapacityKg - stats.totalLoadedKg);

  const handleInspectTruck = (truck) => {
    setSelectedTruck(truck);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header with Carrier Actions */}
      <PageHeader
        eyebrow="Carrier Operations Workstation"
        title="Fleet Command & Capacity Management"
        description="Monitor commercial vehicles, driver allocations, and payload capacity across regional corridors."
        badge={<Badge variant="aqua" dot>Carrier Fleet Active</Badge>}
        breadcrumbs={[
          { label: "Carrier", href: "/company" },
          { label: "Fleet Command" },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchFleetData}
              isLoading={loading}
              leftIcon={RefreshCw}
            >
              Refresh
            </Button>
            <Link to="/route">
              <Button variant="secondary" size="sm" leftIcon={MapPin}>
                Configure Route
              </Button>
            </Link>
            <Link to="/truck">
              <Button variant="primary" size="sm" leftIcon={Plus}>
                Register Vehicle
              </Button>
            </Link>
          </div>
        }
      />

      {/* Error Panel if failed */}
      {error && (
        <ErrorPanel
          title="Fleet Telemetry Error"
          message={error}
          onRetry={fetchFleetData}
        />
      )}

      {/* 2. Fleet Readiness & Capacity KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Registered Fleet"
          value={stats.totalTrucks}
          unit="Vehicles"
          subtitle="Total company-owned commercial fleet"
          change={`${stats.activeAssignments} Drivers Assigned`}
          changeType="neutral"
        />
        <StatCard
          label="Active Corridor Trips"
          value={stats.activeTrips}
          unit="Dispatches"
          subtitle="Vehicles deployed with assigned route"
          change="Live on Road"
          changeType="positive"
        />
        <StatCard
          label="Standby Capacity"
          value={stats.availableTrucks}
          unit="Available"
          subtitle="Ready for corridor route assignment"
          change={stats.availableTrucks > 0 ? "Ready for Route" : "Fully Committed"}
          changeType={stats.availableTrucks > 0 ? "positive" : "neutral"}
        />
        <StatCard
          label="FreeTruck Pool Recycling"
          value={inPoolCount}
          unit="In Pool"
          subtitle="Vehicles freed by load consolidation"
          change={inPoolCount > 0 ? "Available for Re-Dispatch" : "No Freed Trucks"}
          changeType={inPoolCount > 0 ? "positive" : "neutral"}
        />
      </div>

      {/* 3. Fleet Capacity Allocation Cockpit Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Fleet Payload Allocation Bar */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface/90 border border-border shadow-subtle-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-ink-subtle font-semibold block">
                Committed Payload vs Rated Capacity
              </span>
              <h3 className="text-base font-bold text-ink mt-0.5">
                Fleet Payload Utilization Index
              </h3>
            </div>
            <Badge variant={stats.overallUtilizationPct > 80 ? "amber" : "aqua"} size="sm">
              {stats.overallUtilizationPct}% Committed
            </Badge>
          </div>

          {/* Large Capacity Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-ink">
                Loaded: <strong>{stats.totalLoadedKg.toLocaleString()} kg</strong>
              </span>
              <span className="text-ink-subtle">
                Rated Fleet Limit: <strong>{stats.totalCapacityKg.toLocaleString()} kg</strong>
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden border border-border/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.overallUtilizationPct > 90
                    ? "bg-signal-coral"
                    : stats.overallUtilizationPct >= 65
                    ? "bg-signal-emerald"
                    : "bg-signal-aqua"
                }`}
                style={{ width: `${Math.min(100, stats.overallUtilizationPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-subtle">
              <span>Available Payload Headroom: <strong className="text-signal-emerald">{remainingHeadroomKg.toLocaleString()} kg</strong></span>
              <span>{stats.totalTrucks} Vehicles Registered</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Action Shortcuts */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border shadow-subtle-card space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-subtle font-semibold block">
              Quick Operations
            </span>
            <h4 className="text-sm font-bold text-ink">
              Fleet Deployment
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Launch vehicles onto regional freight corridors or onboard new commercial trucks.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link to="/truck" className="block">
              <Button variant="primary" size="sm" leftIcon={Plus} className="w-full">
                Register New Truck
              </Button>
            </Link>
            <Link to="/route" className="block">
              <Button variant="secondary" size="sm" leftIcon={MapPin} className="w-full">
                Configure Corridor Route
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Fleet Operations Table & Filters */}
      <div className="space-y-4 pt-2 border-t border-border">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter Controls */}
          <div className="inline-flex items-center p-1 rounded-md bg-surface-elevated border border-border shrink-0 overflow-x-auto">
            {[
              { id: "all", label: "All Vehicles", count: trucks.length },
              { id: "active", label: "Active Trips", count: activeCount },
              { id: "available", label: "Standby Available", count: stats.availableTrucks },
              { id: "free", label: "In Free Pool", count: inPoolCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all select-none ${
                  filterTab === tab.id
                    ? "bg-surface text-signal-aqua border border-border font-semibold shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle text-ink-subtle">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="max-w-xs w-full">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search plate, corridor, or driver..."
            />
          </div>
        </div>

        {/* Fleet Table */}
        {loading ? (
          <CardSkeleton />
        ) : filteredTrucks.length > 0 ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Vehicle Plate</TableHead>
                <TableHead>Operational Status</TableHead>
                <TableHead>Assigned Corridor</TableHead>
                <TableHead>Driver Assignment</TableHead>
                <TableHead>Capacity Utilization</TableHead>
                <TableHead align="right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredTrucks.map((truck) => {
                const cap = truck.totalCapacity || 1;
                const peakLoad = truck.peakLoad || 0;
                const utilPct = truck.utilizationPct || 0;
                const driver = truck.assignment?.driverId;
                const route = truck.route;

                return (
                  <TableRow key={truck._id} hover>
                    {/* Plate */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-signal-aqua shrink-0" />
                        <span className="font-mono text-xs sm:text-sm font-semibold text-ink">
                          {truck.licensePlate}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {getOperationalStatusBadge(truck)}
                    </TableCell>

                    {/* Corridor Route */}
                    <TableCell>
                      {route ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="text-xs font-mono font-medium text-ink flex items-center gap-1.5 flex-wrap">
                            <span>{route.source}</span>
                            <span className="text-ink-subtle">→</span>
                            <span>{route.destination}</span>
                          </div>
                          {route.stops && route.stops.length > 0 && (
                            <span className="text-[10.5px] font-mono text-ink-subtle">
                              via {route.stops.join(", ")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-subtle text-xs italic font-mono">
                          No Route Configured
                        </span>
                      )}
                    </TableCell>

                    {/* Driver */}
                    <TableCell>
                      {driver ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-ink flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-signal-emerald shrink-0" />
                            {driver.name}
                          </span>
                          {driver.phone && (
                            <span className="text-[10.5px] font-mono text-ink-subtle">
                              {driver.phone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-subtle text-xs font-mono">
                          Unassigned
                        </span>
                      )}
                    </TableCell>

                    {/* Capacity Utilization Progress Bar */}
                    <TableCell isNumeric>
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-ink-subtle">{peakLoad.toLocaleString()} / {cap.toLocaleString()} kg</span>
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
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleInspectTruck(truck)}
                        >
                          Inspect
                        </Button>
                        <Link to="/truck">
                          <Button variant="secondary" size="xs">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Truck}
            title="No Fleet Vehicles Found"
            description={
              searchQuery
                ? `No vehicles matching "${searchQuery}".`
                : "No commercial vehicles registered in this category. Register your first vehicle to deploy it on regional routes."
            }
            actionLabel="Register Vehicle"
            onAction={() => window.location.assign("/truck")}
          />
        )}
      </div>

      {/* 5. Truck Inspection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTruck(null);
        }}
        title={selectedTruck ? `Vehicle Manifest: ${selectedTruck.licensePlate}` : "Vehicle Details"}
        description={selectedTruck?.route ? `Corridor: ${selectedTruck.route.source} → ${selectedTruck.route.destination}` : "Standby vehicle"}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link to="/truck">
              <Button variant="secondary" size="sm">
                Open Fleet Registry
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedTruck(null);
              }}
            >
              Done
            </Button>
          </div>
        }
      >
        {selectedTruck && (
          <div className="space-y-4 text-xs">
            {/* Status & Capacity Card */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-ink">
                  {selectedTruck.licensePlate}
                </span>
                {getOperationalStatusBadge(selectedTruck)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-ink-subtle font-mono text-[11px] pt-2 border-t border-border/40">
                <div>
                  Rated Capacity: <strong className="text-ink">{selectedTruck.totalCapacity?.toLocaleString()} kg</strong>
                </div>
                <div>
                  Peak Utilization: <strong className="text-signal-aqua">{selectedTruck.utilizationPct || 0}%</strong>
                </div>
              </div>
            </div>

            {/* Route Timeline Inspection */}
            {selectedTruck.route && (
              <div className="space-y-2">
                <span className="cx-eyebrow text-ink-muted">
                  Corridor Progression & Stops
                </span>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <CorridorTimeline
                    stops={selectedTruck.route.stops || []}
                    currentLoad={selectedTruck.currentLoad || []}
                    totalCapacity={selectedTruck.totalCapacity || 10000}
                    source={selectedTruck.route.source}
                    destination={selectedTruck.route.destination}
                  />
                </div>
              </div>
            )}

            {/* Driver Assignment Card */}
            <div className="space-y-2">
              <span className="cx-eyebrow text-ink-muted">
                Driver Allocation
              </span>
              <div className="p-3.5 rounded-lg bg-surface border border-border flex items-center justify-between">
                {selectedTruck.assignment?.driverId ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-signal-emerald/15 border border-signal-emerald/30 flex items-center justify-center text-signal-emerald">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-ink text-xs block">
                        {selectedTruck.assignment.driverId.name}
                      </span>
                      <span className="text-[11px] font-mono text-ink-subtle block">
                        Phone: {selectedTruck.assignment.driverId.phone || "Verified"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-ink-subtle italic">
                    No active driver assigned to this vehicle.
                  </div>
                )}
                <Badge variant={selectedTruck.assignment?.driverId ? "emerald" : "neutral"} size="sm">
                  {selectedTruck.assignment?.driverId ? "Driver Ready" : "Unassigned"}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CompanyDashboard;
