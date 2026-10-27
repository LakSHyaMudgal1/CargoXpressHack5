import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Truck,
  MapPin,
  Plus,
  RefreshCw,
  UserCheck,
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

const CompanyDashboard = () => {
  const [fleetData, setFleetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "active" | "available" | "free"

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
    // Tab filter
    if (filterTab === "active" && t.operationalStatus !== "active_assignment") return false;
    if (filterTab === "available" && t.operationalStatus !== "available_unassigned" && t.operationalStatus !== "available_in_pool") return false;
    if (filterTab === "free" && !t.isFreeInPool) return false;

    // Search query
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
        return <Badge variant="emerald" size="sm">Available on Standby</Badge>;
      case "assigned_awaiting_route":
        return <Badge variant="amber" size="sm">Awaiting Route Plan</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Registered</Badge>;
    }
  };

  const remainingHeadroomKg = Math.max(0, stats.totalCapacityKg - stats.totalLoadedKg);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header with Carrier Actions */}
      <PageHeader
        eyebrow="Carrier Operations Workstation"
        title="Fleet Vehicles & Route Corridors"
        description="Monitor your commercial vehicles, driver allocations, and payload capacity across regional corridors."
        badge={<Badge variant="aqua" dot>Carrier Fleet Active</Badge>}
        breadcrumbs={[
          { label: "Carrier", href: "/company" },
          { label: "Fleet Operations" },
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
              Refresh Fleet
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
          subtitle="Total company-owned trucks"
          change={`${stats.activeAssignments} Drivers Assigned`}
          changeType="neutral"
        />
        <StatCard
          label="Active Trips"
          value={stats.activeTrips}
          unit="Dispatches"
          subtitle="Vehicles with assigned corridor"
          change="En Route"
          changeType="positive"
        />
        <StatCard
          label="Standby Vehicles"
          value={stats.availableTrucks}
          unit="Available"
          subtitle="Ready for corridor scheduling"
          change={stats.availableTrucks > 0 ? "Ready for Route" : "Fully Assigned"}
          changeType={stats.availableTrucks > 0 ? "positive" : "neutral"}
        />
        <StatCard
          label="Payload Capacity Headroom"
          value={`${remainingHeadroomKg.toLocaleString()} kg`}
          unit={`/ ${stats.totalCapacityKg.toLocaleString()} Total`}
          subtitle={`${stats.overallUtilizationPct}% payload capacity committed`}
          change="Real-time"
          changeType="neutral"
        />
      </div>

      {/* 3. Fleet Management Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/truck"
          className="p-3.5 rounded-lg bg-surface/70 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-surface-elevated border border-border flex items-center justify-center text-signal-aqua group-hover:border-signal-aqua/40 transition-colors">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm text-ink block">Register Commercial Truck</span>
              <span className="text-[11px] text-ink-subtle block font-mono">
                Add license plate, vehicle gross weight, and rated capacity
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/route"
          className="p-3.5 rounded-lg bg-surface/70 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-surface-elevated border border-border flex items-center justify-center text-signal-emerald group-hover:border-signal-emerald/40 transition-colors">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm text-ink block">Configure Delivery Route</span>
              <span className="text-[11px] text-ink-subtle block font-mono">
                Define source, intermediate pickup stops, and destination
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
        </Link>
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
                <TableHead align="right">Manage</TableHead>
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
                        <Truck className="w-4 h-4 text-signal-aqua" />
                        <span className="font-mono text-xs sm:text-sm font-semibold text-ink">
                          {truck.licensePlate}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {getOperationalStatusBadge(truck)}
                    </TableCell>

                    {/* Corridor */}
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
                            <UserCheck className="w-3.5 h-3.5 text-signal-emerald" />
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

                    {/* Action */}
                    <TableCell align="right">
                      <Link to="/truck">
                        <Button variant="secondary" size="xs">
                          Manage
                        </Button>
                      </Link>
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
    </div>
  );
};

export default CompanyDashboard;
