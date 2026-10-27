import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import {
  Truck as TruckIcon,
  Plus,
  RefreshCw,
  UserCheck,
  MapPin,
  Boxes,
  RotateCcw,
  Eye,
  X,
  LayoutGrid,
  List
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import SearchInput from "../components/ui/SearchInput";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import ErrorPanel from "../components/ui/ErrorPanel";
import { CardSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { DataTable } from "../components/ui/Table";

const Truck = () => {
  const user = useSelector((store) => store.user);
  const isAdmin = Boolean(user?.emailId?.endsWith("@cargoxpress.com"));

  const [fleetData, setFleetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // "all" | "active" | "available" | "free"
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  // Registration Modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [totalCapacity, setTotalCapacity] = useState("");
  const [stops, setStops] = useState(["Stop-1"]);
  const [currentLoad, setCurrentLoad] = useState([""]);
  const [formError, setFormError] = useState("");
  const [plateError, setPlateError] = useState("");
  const [plateChecking, setPlateChecking] = useState(false);
  const [plateExists, setPlateExists] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Details Modal
  const [inspectTruck, setInspectTruck] = useState(null);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const fetchFleet = useCallback(async () => {
    if (isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(BASE_URL + "/company/fleet", { withCredentials: true });
      setFleetData(res.data);
    } catch (err) {
      console.error("Error fetching company fleet:", err);
      // If not logged in as company or endpoint fails, fall back gracefully
      setError(err.response?.data?.message || err.message || "Failed to load fleet.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user && isAdmin) {
      showToast("neutral", "Access Restricted", "Vehicle registration is managed directly by transport carriers.");
      navigate("/admin", { replace: true });
      return;
    }
    if (!isAdmin) {
      fetchFleet();
    }
  }, [user, isAdmin, navigate, fetchFleet, showToast]);

  const handlePlateBlur = async () => {
    if (!licensePlate.trim()) return;
    setPlateChecking(true);
    setPlateError("");
    try {
      const res = await axios.get(
        BASE_URL + "/scheduleDelivery/checkplate?licensePlate=" + encodeURIComponent(licensePlate.trim().toUpperCase()),
        { withCredentials: true }
      );
      if (res.data.exists) {
        setPlateError("This license plate is already registered.");
        setPlateExists(true);
      } else {
        setPlateError("");
        setPlateExists(false);
      }
    } catch {
      setPlateExists(false);
    } finally {
      setPlateChecking(false);
    }
  };

  const addStop = () => {
    if (stops.length < 10) {
      setStops([...stops, `Stop-${stops.length + 1}`]);
      setCurrentLoad([...currentLoad, ""]);
    }
  };

  const removeStop = (idx) => {
    if (stops.length > 1) {
      setStops(stops.filter((_, i) => i !== idx));
      setCurrentLoad(currentLoad.filter((_, i) => i !== idx));
    }
  };

  const updateCurrentLoad = (index, value) => {
    const updated = [...currentLoad];
    updated[index] = value;
    setCurrentLoad(updated);
  };

  const handleAddTruck = async (e) => {
    e?.preventDefault();
    if (plateExists) return;
    if (!licensePlate.trim()) {
      setPlateError("License plate is required.");
      return;
    }
    const parsedCapacity = Number(totalCapacity);
    if (!parsedCapacity || parsedCapacity <= 0) {
      setFormError("Total capacity must be a positive number.");
      return;
    }

    const parsedLoad = currentLoad.map((l) => Number(l) || 0);
    const exceeds = parsedLoad.some((l) => l > parsedCapacity);
    if (exceeds) {
      setFormError("Load at any stop cannot exceed total vehicle capacity.");
      return;
    }

    try {
      setRegistering(true);
      setFormError("");
      const cleanPlate = licensePlate.trim().toUpperCase();

      await axios.post(
        BASE_URL + "/scheduleDelivery/addtruck",
        { licensePlate: cleanPlate, totalCapacity: parsedCapacity, currentLoad: parsedLoad },
        { withCredentials: true }
      );

      showToast("success", "Truck Registered", `Vehicle ${cleanPlate} registered successfully.`);
      setIsRegisterOpen(false);

      // Offer route setup
      navigate("/route", {
        state: {
          licensePlate: cleanPlate,
          totalCapacity: parsedCapacity,
          currentLoad: parsedLoad,
          remainingLoad: parsedLoad.map((l) => parsedCapacity - l),
          stops,
        },
      });
    } catch (err) {
      console.error("Add truck error:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to register truck.";
      setFormError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setRegistering(false);
    }
  };

  const trucks = fleetData?.trucks || [];
  const stats = fleetData?.stats || {
    totalTrucks: trucks.length,
    availableTrucks: 0,
    activeAssignments: 0,
    activeTrips: 0,
    freeTrucksInPool: 0,
    overallUtilizationPct: 0,
    totalCapacityKg: 0,
  };

  const genuinelyAvailableCount = trucks.filter(
    (t) => t.operationalStatus === "available_unassigned" && !t.isFreeInPool
  ).length;
  const activeTripsCount = trucks.filter((t) => t.operationalStatus === "active_assignment").length;
  const reservedCount = trucks.filter((t) => t.operationalStatus === "assigned_awaiting_route").length;
  const freePoolCount = trucks.filter((t) => t.isFreeInPool).length;

  const filteredTrucks = trucks.filter((t) => {
    if (filterTab === "active" && t.operationalStatus !== "active_assignment") return false;
    if (filterTab === "available" && (t.operationalStatus !== "available_unassigned" || t.isFreeInPool)) return false;
    if (filterTab === "reserved" && t.operationalStatus !== "assigned_awaiting_route") return false;
    if (filterTab === "free" && !t.isFreeInPool) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const plate = t.licensePlate?.toLowerCase() || "";
    const source = t.route?.source?.toLowerCase() || "";
    const dest = t.route?.destination?.toLowerCase() || "";
    const driver = t.assignment?.driverId?.name?.toLowerCase() || "";
    return plate.includes(q) || source.includes(q) || dest.includes(q) || driver.includes(q);
  });

  const getOperationalStatusBadge = (t) => {
    if (t.isFreeInPool) return <Badge variant="purple" dot>FreeTruck Pool (Absorbed)</Badge>;
    if (t.operationalStatus === "active_assignment") return <Badge variant="emerald" dot>Active on Trip</Badge>;
    if (t.operationalStatus === "assigned_awaiting_route") return <Badge variant="amber" dot>Reserved • Awaiting Route</Badge>;
    if (t.operationalStatus === "available_unassigned") return <Badge variant="aqua" dot>Genuinely Available</Badge>;
    return <Badge variant="neutral">Standby</Badge>;
  };

  const tableColumns = [
    {
      id: "licensePlate",
      header: "License Plate",
      accessorKey: "licensePlate",
      sortable: true,
      cell: ({ row }) => (
        <span className="font-mono font-bold text-ink flex items-center gap-2">
          <TruckIcon className="w-3.5 h-3.5 text-signal-aqua shrink-0" />
          {row.licensePlate}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (r) => r.operationalStatus,
      cell: ({ row }) => getOperationalStatusBadge(row),
    },
    {
      id: "corridor",
      header: "Corridor",
      accessorFn: (r) => (r.route ? `${r.route.source} → ${r.route.destination}` : "Unassigned"),
      sortable: true,
      cell: ({ row }) =>
        row.route ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-signal-aqua font-medium">{row.route.source}</span>
            <span className="text-ink-subtle">→</span>
            <span className="text-signal-emerald font-medium">{row.route.destination}</span>
            {row.route.stops?.length > 0 && (
              <span className="text-[10px] font-mono text-ink-subtle">
                ({row.route.stops.length} stops)
              </span>
            )}
          </div>
        ) : (
          <span className="text-ink-subtle italic text-xs">No corridor</span>
        ),
    },
    {
      id: "driver",
      header: "Driver",
      accessorFn: (r) => r.assignment?.driverId?.name || "Unassigned",
      sortable: true,
      cell: ({ row }) =>
        row.assignment?.driverId ? (
          <span className="font-semibold text-ink text-xs">{row.assignment.driverId.name}</span>
        ) : (
          <span className="text-ink-subtle italic text-xs">Unassigned</span>
        ),
    },
    {
      id: "peakLoad",
      header: "Peak Load",
      accessorKey: "peakLoad",
      isNumeric: true,
      sortable: true,
      cell: ({ row }) => `${(row.peakLoad || 0).toLocaleString()} kg`,
    },
    {
      id: "capacity",
      header: "Rated Capacity",
      accessorKey: "totalCapacity",
      isNumeric: true,
      sortable: true,
      cell: ({ row }) => `${(row.totalCapacity || 0).toLocaleString()} kg`,
    },
    {
      id: "utilization",
      header: "Utilization",
      accessorKey: "utilizationPct",
      isNumeric: true,
      sortable: true,
      cell: ({ row }) => {
        const pct = row.utilizationPct || 0;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pct > 90 ? "bg-signal-coral" : pct > 70 ? "bg-signal-amber" : "bg-signal-aqua"
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="font-mono text-xs">{pct}%</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setInspectTruck(row)}
            className="text-xs h-7"
          >
            Specs
          </Button>
          {row.route ? (
            <Badge variant="aqua" size="sm">
              Route Active
            </Badge>
          ) : (
            <Link to="/route" state={{ licensePlate: row.licensePlate, totalCapacity: row.totalCapacity }}>
              <Button variant="secondary" size="xs" className="text-xs h-7">
                + Route
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  if (user && isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Fleet Operations"
        title="Vehicles & Capacity Registry"
        description="Onboard transport vehicles, inspect rated payload capacities, manage driver assignments, and establish delivery corridors."
        badge={<Badge variant="aqua" dot>Fleet Registry</Badge>}
        breadcrumbs={[
          { label: "Company", href: "/company" },
          { label: "Fleet Vehicles" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchFleet}
              isLoading={loading}
              leftIcon={RefreshCw}
            >
              Refresh Fleet
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRegisterOpen(true)}
              leftIcon={Plus}
            >
              Register Truck
            </Button>
          </div>
        }
      />

      {/* Error State */}
      {error && (
        <ErrorPanel
          title="Fleet Sync Error"
          message={error}
          onRetry={fetchFleet}
        />
      )}

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Registered Fleet"
          value={stats.totalTrucks}
          unit="Vehicles"
          icon={TruckIcon}
          subtitle={`${stats.availableTrucks} available for allocation`}
          change="Carrier Fleet"
          changeType="positive"
        />
        <StatCard
          label="Active Dispatches"
          value={stats.activeTrips}
          unit="Trips"
          icon={MapPin}
          subtitle={`${stats.activeAssignments} active driver assignments`}
          change="Live Transit"
          changeType="positive"
        />
        <StatCard
          label="Fleet Capacity"
          value={`${stats.overallUtilizationPct}%`}
          unit="Used"
          icon={Boxes}
          subtitle={`${stats.totalCapacityKg?.toLocaleString() || 0} kg rated`}
          change="Payload"
          changeType="positive"
        />
        <StatCard
          label="FreeTruck Pool"
          value={stats.freeTrucksInPool}
          unit="Vehicles"
          icon={RotateCcw}
          subtitle="Absorbed trucks released via merge"
          change="Available"
          changeType="positive"
        />
      </div>

      {/* 3. Toolbar: Filter Tabs & Search */}
      <div className="space-y-6 pt-2 border-t border-border/80">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="inline-flex items-center p-1 rounded-lg bg-surface-elevated border border-border shrink-0 overflow-x-auto">
            {[
              { id: "all", label: "All Vehicles", count: trucks.length },
              { id: "active", label: "Active Trips", count: activeTripsCount },
              { id: "available", label: "Genuinely Available", count: genuinelyAvailableCount },
              { id: "reserved", label: "Reserved", count: reservedCount },
              { id: "free", label: "In Free Pool", count: freePoolCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all select-none ${
                  filterTab === tab.id
                    ? "bg-surface-card text-signal-aqua border border-border shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-white/5 text-ink-subtle">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-elevated border border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "cards" ? "bg-surface-card text-signal-aqua shadow-sm" : "text-ink-subtle hover:text-ink"
                }`}
                aria-label="Grid view"
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "table" ? "bg-surface-card text-signal-aqua shadow-sm" : "text-ink-subtle hover:text-ink"
                }`}
                aria-label="Table view"
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="max-w-xs w-full">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
                placeholder="Search plate, corridor, or driver..."
              />
            </div>
          </div>
        </div>

        {/* 4. Fleet Vehicles Cards or Table */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filteredTrucks.length > 0 ? (
          viewMode === "table" ? (
            <DataTable
              columns={tableColumns}
              data={filteredTrucks}
              keyField="_id"
              onRowClick={(row) => setInspectTruck(row)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTrucks.map((truck) => (
              <Card key={truck._id} className="p-5 flex flex-col justify-between hover:border-border-hover transition-all">
                <div className="space-y-4">
                  {/* Top Bar: Plate & Operational Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-surface-elevated border border-border text-signal-aqua">
                        <TruckIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle block">
                          License Plate
                        </span>
                        <h4 className="font-mono text-base font-bold text-ink">
                          {truck.licensePlate}
                        </h4>
                      </div>
                    </div>
                    {getOperationalStatusBadge(truck)}
                  </div>

                  {/* Route Information */}
                  <div className="p-3 rounded-xl bg-surface/50 border border-border/60 text-xs space-y-1.5">
                    <span className="text-[10px] font-mono text-ink-subtle block">Scheduled Corridor:</span>
                    {truck.route ? (
                      <div>
                        <div className="flex items-center gap-1.5 font-medium text-ink">
                          <span className="text-signal-aqua font-semibold">{truck.route.source}</span>
                          <span className="text-ink-subtle">→</span>
                          <span className="text-signal-emerald font-semibold">{truck.route.destination}</span>
                        </div>
                        {truck.route.stops && truck.route.stops.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {truck.route.stops.map((stop, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-1.5 py-0.5 rounded bg-surface-elevated text-ink-muted text-[10px] font-mono"
                              >
                                {stop}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-ink-subtle italic text-[11px]">No active route</span>
                        <Link to="/route" state={{ licensePlate: truck.licensePlate, totalCapacity: truck.totalCapacity }}>
                          <Button variant="ghost" size="sm" className="text-xs h-6 px-2 text-signal-aqua">
                            + Add Route
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Driver & Capacity */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-surface/30 border border-border/40">
                      <span className="text-[10px] text-ink-subtle block">Driver</span>
                      {truck.assignment?.driverId ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <UserCheck className="w-3.5 h-3.5 text-signal-emerald shrink-0" />
                          <span className="font-semibold text-ink truncate">
                            {truck.assignment.driverId.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-subtle italic text-[11px]">Unassigned</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-surface/30 border border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ink-subtle">Payload</span>
                        <span className="font-mono text-xs font-semibold text-ink">
                          {truck.utilizationPct || 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full bg-signal-aqua"
                          style={{ width: `${truck.utilizationPct || 0}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-ink-subtle mt-1 text-right">
                        {truck.totalCapacity?.toLocaleString()} kg max
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInspectTruck(truck)}
                    className="text-xs h-7 px-2"
                    leftIcon={Eye}
                  >
                    Inspect Details
                  </Button>
                  <Link to="/route" state={{ licensePlate: truck.licensePlate, totalCapacity: truck.totalCapacity }}>
                    <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5">
                      Schedule Route
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
            </div>
          )
        ) : (
          <EmptyState
            icon={TruckIcon}
            title="No Trucks in Fleet"
            description={
              searchQuery
                ? `No vehicles matched query "${searchQuery}".`
                : "No vehicles found in this operational view. Click 'Register Truck' to onboard a vehicle."
            }
            action={
              <Button variant="primary" onClick={() => setIsRegisterOpen(true)} leftIcon={Plus}>
                Register Truck
              </Button>
            }
          />
        )}
      </div>

      {/* ════════════ MODAL 1: REGISTER TRUCK ════════════ */}
      {isRegisterOpen && (
        <Modal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          title="Register Fleet Vehicle"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setIsRegisterOpen(false)}
                disabled={registering}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddTruck}
                isLoading={registering}
                leftIcon={Plus}
              >
                Save & Continue to Route
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAddTruck} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-signal-coral/10 border border-signal-coral/20 text-signal-coral">
                {formError}
              </div>
            )}

            {/* Section 1: Vehicle Identification */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-semibold block">
                1. Commercial Vehicle Identification
              </span>
              <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1">
                License Plate Number *
              </label>
              <Input
                placeholder="e.g. MH12AB1234"
                value={licensePlate}
                onChange={(e) => {
                  setLicensePlate(e.target.value.toUpperCase());
                  setPlateError("");
                }}
                onBlur={handlePlateBlur}
                error={plateError}
                autoFocus
                required
              />
              {plateChecking && (
                <span className="text-[10px] text-ink-subtle mt-1 block">Checking plate availability...</span>
              )}
            </div>

            {/* Section 2: Rated Payload Capacity */}
            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-semibold block">
                2. Rated Payload Capacity
              </span>
              <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1">
                Total Rated Capacity (kg) *
              </label>
              <Input
                type="number"
                placeholder="e.g. 10000"
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(e.target.value)}
                min="100"
                required
              />
              <span className="text-[10px] text-ink-subtle block">
                Gross vehicle cargo payload rating in kilograms. Used by the optimization engine for weight safety.
              </span>
            </div>

            {/* Section 3: Stop-level Initial Load Distribution */}
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-semibold block">
                    3. Initial Stop Cargo Distribution
                  </span>
                  <span className="text-[10px] text-ink-subtle">
                    Pre-existing load at waypoints (cannot exceed total rated capacity).
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addStop}
                  className="text-xs h-6 px-2 text-signal-aqua"
                >
                  + Add Stop
                </Button>
              </div>

              <div className="space-y-2">
                {stops.map((label, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-subtle w-16">{label}:</span>
                    <Input
                      type="number"
                      placeholder="Load (kg)"
                      value={currentLoad[idx] || ""}
                      onChange={(e) => updateCurrentLoad(idx, e.target.value)}
                      className="flex-1"
                    />
                    {stops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStop(idx)}
                        className="p-1.5 text-ink-subtle hover:text-signal-coral rounded-md"
                        aria-label="Remove stop"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════ MODAL 2: INSPECT TRUCK DETAILS ════════════ */}
      {inspectTruck && (
        <Modal
          isOpen={!!inspectTruck}
          onClose={() => setInspectTruck(null)}
          title={`Vehicle Specifications: ${inspectTruck.licensePlate}`}
          footer={
            <Button variant="secondary" onClick={() => setInspectTruck(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-base text-ink">{inspectTruck.licensePlate}</span>
                {getOperationalStatusBadge(inspectTruck)}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div>
                  <span className="text-[10px] text-ink-subtle block">Payload Capacity</span>
                  <span className="font-mono font-bold text-sm text-signal-aqua">
                    {inspectTruck.totalCapacity?.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-subtle block">Peak Current Load</span>
                  <span className="font-mono font-bold text-sm text-ink">
                    {inspectTruck.peakLoad || 0} kg ({inspectTruck.utilizationPct || 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Route */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle font-semibold block">
                Scheduled Corridor
              </span>
              {inspectTruck.route ? (
                <div>
                  <p className="font-bold text-ink text-sm">
                    {inspectTruck.route.source} → {inspectTruck.route.destination}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-1 font-mono">
                    Stops: {inspectTruck.route.stops?.join(", ") || "None"}
                  </p>
                </div>
              ) : (
                <p className="text-ink-subtle italic">No active route schedule assigned.</p>
              )}
            </div>

            {/* Assigned Driver */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle font-semibold block">
                Assigned Driver
              </span>
              {inspectTruck.assignment?.driverId ? (
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-signal-emerald" />
                  <div>
                    <p className="font-bold text-ink">{inspectTruck.assignment.driverId.name}</p>
                    <p className="text-[11px] text-ink-subtle font-mono">
                      Phone: {inspectTruck.assignment.driverId.phone || "Verified"} • License: {inspectTruck.assignment.driverId.licenseNumber || "Commercial"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-ink-subtle italic">No active driver assigned.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Truck;
