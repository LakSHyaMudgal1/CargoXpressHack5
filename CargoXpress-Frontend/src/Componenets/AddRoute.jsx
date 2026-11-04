import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Route as RouteIcon,
  Truck,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Flag,
  Navigation,
  Sparkles,
  Layers,
  ArrowDown
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";

// High-frequency Indian commercial freight corridors for 1-click convenience
const CORRIDOR_PRESETS = [
  {
    name: "Western Expressway",
    source: "Mumbai",
    destination: "Ahmedabad",
    stops: ["Surat", "Vadodara"]
  },
  {
    name: "Northern Hub",
    source: "Delhi",
    destination: "Lucknow",
    stops: ["Moradabad", "Bareilly"]
  },
  {
    name: "Southern Corridor",
    source: "Chennai",
    destination: "Bengaluru",
    stops: ["Vellore"]
  },
  {
    name: "Deccan Transit",
    source: "Pune",
    destination: "Hubballi",
    stops: ["Satara", "Kolhapur", "Belagavi"]
  }
];

const AddRoute = () => {
  const user = useSelector((store) => store.user);
  const isAdmin = Boolean(user?.emailId?.endsWith("@cargoxpress.com"));

  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      showToast("neutral", "Access Restricted", "Route scheduling is managed directly by transport carriers.");
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, navigate, showToast]);

  const fromTruck = location.state || {};
  const truckCapacity = fromTruck.totalCapacity || null;
  const rawStops = Array.isArray(fromTruck.stops) ? fromTruck.stops : [];

  // Intelligently detect if stops from registration are actual cities or generic "Stop-1"
  const isGeneric = (s) => !s || /^Stop[-_\s]*\d+$/i.test(s.trim());
  const validStops = rawStops.filter((s) => !isGeneric(s));

  const initialSource = validStops.length >= 2 ? validStops[0] : (fromTruck.source || "");
  const initialDestination = validStops.length >= 2 ? validStops[validStops.length - 1] : (fromTruck.destination || "");
  const initialIntermediate = validStops.length > 2 ? validStops.slice(1, -1) : [];

  const [licensePlate, setLicensePlate] = useState(fromTruck.licensePlate ?? "");
  const [source, setSource] = useState(initialSource);
  const [destination, setDestination] = useState(initialDestination);
  const [stops, setStops] = useState(initialIntermediate); // Starts empty if no explicit waypoints!
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const addStop = () => {
    if (stops.length < 8) {
      setStops([...stops, ""]);
    }
  };

  const removeStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const updateStop = (index, value) => {
    const updated = [...stops];
    updated[index] = value;
    setStops(updated);
  };

  const applyPreset = (preset) => {
    setSource(preset.source);
    setDestination(preset.destination);
    setStops([...preset.stops]);
    setError("");
  };

  const handleAddRoute = async (e) => {
    e?.preventDefault();
    if (!licensePlate.trim() || !source.trim() || !destination.trim()) {
      setError("Assigned vehicle plate, origin city, and destination are required.");
      return;
    }

    const cleanIntermediate = stops.map((s) => s.trim()).filter(Boolean);
    // Build authoritative full stop sequence
    const fullStops = [
      source.trim(),
      ...cleanIntermediate.filter(
        (s) => s.toLowerCase() !== source.trim().toLowerCase() && s.toLowerCase() !== destination.trim().toLowerCase()
      ),
      destination.trim()
    ];

    try {
      setLoading(true);
      setError("");
      await axios.post(
        BASE_URL + "/scheduleDelivery/addroute",
        {
          licensePlate: licensePlate.trim().toUpperCase(),
          source: source.trim(),
          destination: destination.trim(),
          stops: fullStops,
        },
        { withCredentials: true }
      );

      showToast(
        "success",
        "Corridor Route Established",
        `Freight route ${source.trim()} → ${destination.trim()} established for ${licensePlate.toUpperCase()}.`
      );

      navigate("/truck");
    } catch (err) {
      console.error("Add route error:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to schedule route.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  if (user && isAdmin) {
    return null;
  }

  const activeIntermediateStops = stops.filter((s) => s.trim().length > 0);
  const totalStopsCount = 2 + activeIntermediateStops.length;
  const isDirect = activeIntermediateStops.length === 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto pb-12">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Fleet Operations"
        title="Schedule Corridor Route"
        description="Establish origin-to-destination freight corridors and transit checkpoints to enable algorithmic load consolidation and driver dispatch."
        badge={<Badge variant="aqua" dot>Route Planner</Badge>}
        breadcrumbs={[
          { label: "Fleet", href: "/truck" },
          { label: "Schedule Route" },
        ]}
      />

      {error && (
        <div className="p-4 rounded-xl bg-signal-coral/10 border border-signal-coral/25 text-signal-coral text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-signal-coral animate-ping" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-signal-coral/70 hover:text-signal-coral font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Workspace: Form & Live Blueprint Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Route Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 md:p-7 space-y-6 border border-border/80 shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-signal-aqua/10 border border-signal-aqua/20 flex items-center justify-center text-signal-aqua">
                  <RouteIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Corridor Specification</h3>
                  <p className="text-[11px] text-ink-subtle">Define departure terminal, drop-off, and optional transit waypoints</p>
                </div>
              </div>
              {licensePlate && (
                <Badge variant="neutral" size="sm" className="font-mono text-[11px]">
                  {licensePlate.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Quick Corridor Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-subtle font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-signal-amber" />
                  Quick Corridor Presets
                </span>
                <span className="text-[10px] text-ink-subtle">1-Click Auto-fill</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CORRIDOR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border/70 bg-surface-elevated hover:bg-surface-elevated/90 hover:border-signal-aqua/40 text-ink-muted hover:text-ink transition-all flex items-center gap-1.5 group cursor-pointer shadow-2xs"
                  >
                    <span className="font-medium group-hover:text-signal-aqua transition-colors">{p.source}</span>
                    <span className="text-ink-subtle">→</span>
                    <span className="font-medium group-hover:text-signal-aqua transition-colors">{p.destination}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-surface border border-border/60 text-ink-subtle">
                      +{p.stops.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddRoute} className="space-y-5 text-xs">
              {/* Vehicle License Plate */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-2">
                  Assigned Vehicle Plate *
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g. MH-01-AA-1111"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    required
                    className="font-mono font-bold tracking-wider uppercase text-sm pl-9"
                  />
                  <Truck className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Origin & Destination Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-signal-aqua" />
                    Origin City (Source) *
                  </label>
                  <Input
                    placeholder="e.g. Mumbai"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                    className="text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold flex items-center gap-1.5 mb-2">
                    <Flag className="w-3.5 h-3.5 text-signal-emerald" />
                    Destination City *
                  </label>
                  <Input
                    placeholder="e.g. Ahmedabad"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    className="text-sm font-medium"
                  />
                </div>
              </div>

              {/* Intermediate Transit Waypoints Section */}
              <div className="pt-4 border-t border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-signal-indigo" />
                      Intermediate Transit Stops
                    </label>
                    <span className="text-[10px] text-ink-subtle block mt-0.5">
                      Intermediate hub locations visited sequentially between origin and destination.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addStop}
                    className="text-xs h-8 px-2.5 text-signal-aqua hover:bg-signal-aqua/10"
                    leftIcon={Plus}
                  >
                    Add Waypoint
                  </Button>
                </div>

                {stops.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface/40 text-center space-y-1.5">
                    <p className="text-xs font-medium text-ink-muted">Direct Non-Stop Expressway Corridor</p>
                    <p className="text-[11px] text-ink-subtle">
                      No intermediate hubs scheduled. Click <strong className="text-signal-aqua font-normal">Add Waypoint</strong> if your vehicle stops along the way.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {stops.map((stopVal, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-surface-elevated/70 border border-border/70 transition-all hover:border-signal-aqua/40"
                      >
                        <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center font-mono text-[11px] font-bold text-ink-subtle shrink-0">
                          {sIdx + 1}
                        </div>
                        <Input
                          placeholder={`Waypoint #${sIdx + 1} (e.g. Surat, Vadodara)`}
                          value={stopVal}
                          onChange={(e) => updateStop(sIdx, e.target.value)}
                          className="flex-1 text-xs border-0 bg-transparent focus:ring-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeStop(sIdx)}
                          className="p-1.5 text-ink-subtle hover:text-signal-coral hover:bg-signal-coral/10 rounded-lg transition-colors"
                          title="Remove stop"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-border/70 flex items-center justify-end gap-3">
                <Link to="/truck">
                  <Button variant="secondary" type="button" className="px-5">
                    Cancel
                  </Button>
                </Link>
                <Button variant="primary" type="submit" isLoading={loading} rightIcon={ArrowRight} className="px-6">
                  Save & Establish Route
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Unified Corridor Blueprint & Live Itinerary Preview */}
        <div className="lg:col-span-5 sticky top-20">
          <Card className="p-6 md:p-7 space-y-6 border border-border/80 shadow-lg bg-surface-elevated/90 backdrop-blur-md">
            {/* Blueprint Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-signal-aqua" />
                  <span className="text-[11px] uppercase font-mono tracking-wider text-ink-subtle font-bold">
                    Corridor Blueprint
                  </span>
                </div>
                <h4 className="text-sm font-bold text-ink">Live Route Itinerary</h4>
              </div>
              <Badge variant={isDirect ? "aqua" : "indigo"} size="sm">
                {isDirect ? "Direct Highway" : `${activeIntermediateStops.length} Transit Stops`}
              </Badge>
            </div>

            {/* Vehicle Context Pill */}
            <div className="p-3.5 rounded-xl bg-surface border border-border/80 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-signal-aqua/10 border border-signal-aqua/20 flex items-center justify-center text-signal-aqua shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-ink-subtle block">Target Vehicle</span>
                  <span className="font-mono font-bold text-xs text-ink truncate block">
                    {licensePlate.trim() || fromTruck.licensePlate || "Vehicle Unassigned"}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono uppercase text-ink-subtle block">Rated Payload</span>
                <span className="font-mono font-bold text-xs text-signal-emerald">
                  {truckCapacity ? `${truckCapacity.toLocaleString()} kg` : "Standard Rated"}
                </span>
              </div>
            </div>

            {/* Modern Route Schematic Visualizer */}
            <div className="p-4 rounded-xl bg-surface/70 border border-border/70 space-y-4">
              {/* Origin Node */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-signal-aqua/15 border-2 border-signal-aqua flex items-center justify-center font-mono text-xs font-bold text-signal-aqua shrink-0 shadow-sm">
                  A
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-semibold">
                      Origin • Departure
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-signal-aqua/10 text-signal-aqua font-mono">
                      Pickup Hub
                    </span>
                  </div>
                  <p className="font-bold text-sm text-ink truncate mt-0.5">
                    {source.trim() || <span className="text-ink-subtle italic font-normal">Specify Departure City</span>}
                  </p>
                </div>
              </div>

              {/* Connecting Leg */}
              <div className="ml-4 pl-4 border-l-2 border-dashed border-border/80 py-1 space-y-3">
                {isDirect ? (
                  <div className="py-2.5 px-3 rounded-lg bg-surface-elevated/60 border border-border/50 flex items-center justify-between text-ink-subtle font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-ink-muted">
                      <ArrowDown className="w-3.5 h-3.5 text-signal-aqua" />
                      Direct Transit Leg
                    </span>
                    <span className="text-[10px] text-signal-emerald font-semibold">Expressway Priority</span>
                  </div>
                ) : (
                  stops.map((stopName, idx) => {
                    const cleanName = stopName.trim();
                    return (
                      <div key={idx} className="flex items-center gap-3 relative py-0.5">
                        <div className="w-6 h-6 rounded-lg bg-surface-elevated border border-border flex items-center justify-center font-mono text-[10px] font-bold text-ink-subtle shrink-0 shadow-2xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-mono text-ink-subtle uppercase block">Transit Stop #{idx + 1}</span>
                          <p className="font-semibold text-xs text-ink truncate">
                            {cleanName || <span className="text-ink-subtle italic font-normal">Waypoint City</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Destination Node */}
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-signal-emerald/15 border-2 border-signal-emerald flex items-center justify-center font-mono text-xs font-bold text-signal-emerald shrink-0 shadow-sm">
                  B
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-signal-emerald font-semibold">
                      Destination • Delivery
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-signal-emerald/10 text-signal-emerald font-mono">
                      Drop-off Hub
                    </span>
                  </div>
                  <p className="font-bold text-sm text-ink truncate mt-0.5">
                    {destination.trim() || <span className="text-ink-subtle italic font-normal">Specify Destination City</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Micro-Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-surface border border-border/70">
                <span className="text-[9px] uppercase text-ink-subtle block">Corridor Legs</span>
                <span className="font-bold text-xs text-ink">{totalStopsCount - 1} Transit Legs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border/70">
                <span className="text-[9px] uppercase text-ink-subtle block">Total Stops</span>
                <span className="font-bold text-xs text-signal-aqua">{totalStopsCount} Sequence</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border/70">
                <span className="text-[9px] uppercase text-ink-subtle block">Consolidation</span>
                <span className="font-bold text-xs text-signal-emerald">Eligible</span>
              </div>
            </div>

            {/* Algorithm Guarantee Callout */}
            <div className="p-3.5 rounded-xl bg-signal-aqua/5 border border-signal-aqua/20 flex items-start gap-3 text-xs text-ink-muted">
              <ShieldCheck className="w-4 h-4 text-signal-aqua shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Once saved, the CargoXpress optimizer continuously scans this corridor for compatible shipper consignments and matching carrier routes to maximize load capacity.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddRoute;
