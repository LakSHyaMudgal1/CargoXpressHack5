import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Route as RouteIcon,
  Truck,
  Plus,
  X,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";

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
  const truckCurrentLoad = fromTruck.currentLoad || [];
  const truckRemaining = fromTruck.remainingLoad || [];
  const truckStopLabels = fromTruck.stops || [];

  const [licensePlate, setLicensePlate] = useState(fromTruck.licensePlate ?? "");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const addStop = () => {
    if (stops.length < 10) {
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

  const handleAddRoute = async (e) => {
    e?.preventDefault();
    if (!licensePlate.trim() || !source.trim() || !destination.trim()) {
      setError("License plate, origin source, and destination are required.");
      return;
    }

    const cleanStops = stops.map((s) => s.trim()).filter(Boolean);

    try {
      setLoading(true);
      setError("");
      await axios.post(
        BASE_URL + "/scheduleDelivery/addroute",
        {
          licensePlate: licensePlate.trim().toUpperCase(),
          source: source.trim(),
          destination: destination.trim(),
          stops: cleanStops,
        },
        { withCredentials: true }
      );

      showToast(
        "success",
        "Route Scheduled",
        `Corridor ${source} → ${destination} established for vehicle ${licensePlate.toUpperCase()}.`
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Fleet Operations"
        title="Schedule Delivery Route"
        description="Establish origin-to-destination transport corridors and ordered transit waypoints to enable algorithmic load consolidation."
        badge={<Badge variant="aqua" dot>Route Planner</Badge>}
        breadcrumbs={[
          { label: "Fleet", href: "/truck" },
          { label: "Add Route" },
        ]}
      />

      {error && (
        <div className="p-3.5 rounded-lg bg-signal-coral/10 border border-signal-coral/20 text-signal-coral text-xs">
          {error}
        </div>
      )}

      {/* 2. Main Workspace: Form & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Route Form */}
        <div className="lg:col-span-7">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <RouteIcon className="w-5 h-5 text-signal-aqua" />
              <h3 className="text-sm font-bold text-ink">Corridor Parameters</h3>
            </div>

            <form onSubmit={handleAddRoute} className="space-y-4 text-xs">
              {/* Vehicle License Plate */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                  Assigned Vehicle Plate *
                </label>
                <Input
                  placeholder="e.g. MH12AB1234"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                    Origin City (Source) *
                  </label>
                  <Input
                    placeholder="e.g. Mumbai"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                    Destination City *
                  </label>
                  <Input
                    placeholder="e.g. Delhi"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Intermediate Stops */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block">
                      Intermediate Transit Stops
                    </label>
                    <span className="text-[10px] text-ink-subtle">
                      Stops between origin and destination in planned travel order.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addStop}
                    className="text-xs h-7 text-signal-aqua"
                    leftIcon={Plus}
                  >
                    Add Waypoint
                  </Button>
                </div>

                <div className="space-y-2">
                  {stops.map((stopVal, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-subtle w-20">Stop {sIdx + 1}:</span>
                      <Input
                        placeholder="e.g. Surat, Ahmedabad"
                        value={stopVal}
                        onChange={(e) => updateStop(sIdx, e.target.value)}
                        className="flex-1"
                      />
                      {stops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStop(sIdx)}
                          className="p-1.5 text-ink-subtle hover:text-signal-coral rounded-md"
                          aria-label="Remove waypoint"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
                <Link to="/truck">
                  <Button variant="secondary" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button variant="primary" type="submit" isLoading={loading} rightIcon={ArrowRight}>
                  Save & Establish Route
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Live Itinerary Preview & Vehicle Context */}
        <div className="lg:col-span-5 space-y-4">
          {/* Capacity summary panel if passed from registration */}
          {truckCapacity && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-signal-aqua" />
                  <span className="font-mono font-bold text-xs text-ink">{fromTruck.licensePlate}</span>
                </div>
                <Badge variant="aqua" size="sm">
                  {truckCapacity.toLocaleString()} kg Rated
                </Badge>
              </div>

              {truckStopLabels.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                  <span className="text-[10px] uppercase font-mono text-ink-subtle block">
                    Planned Stop Capacities
                  </span>
                  {truckStopLabels.map((lbl, i) => {
                    const rem = truckRemaining[i] ?? Math.max(0, truckCapacity - (truckCurrentLoad[i] || 0));
                    return (
                      <div key={i} className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-ink-muted">{lbl}</span>
                        <span className="text-signal-emerald font-semibold">{rem.toLocaleString()} kg free</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Ordered Itinerary Preview */}
          <Card className="p-5 space-y-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle font-semibold block">
              Corridor Timeline Preview
            </span>

            <div className="relative pl-6 space-y-4 border-l-2 border-border/60 ml-2 text-xs">
              {/* Origin */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-signal-aqua/20 border-2 border-signal-aqua flex items-center justify-center font-mono text-[10px] font-bold text-signal-aqua">
                  A
                </div>
                <div>
                  <span className="text-[10px] font-mono text-ink-subtle block uppercase">Origin (Pickup)</span>
                  <p className="font-bold text-sm text-ink">{source.trim() || "Pending Origin"}</p>
                </div>
              </div>

              {/* Stops */}
              {stops.map((s, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-surface-elevated border-2 border-border flex items-center justify-center font-mono text-[10px] font-bold text-ink-subtle">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-ink-subtle block">Waypoint #{idx + 1}</span>
                    <p className="font-medium text-ink">{s.trim() || "Unspecified Stop"}</p>
                  </div>
                </div>
              ))}

              {/* Destination */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-signal-emerald/20 border-2 border-signal-emerald flex items-center justify-center font-mono text-[10px] font-bold text-signal-emerald">
                  B
                </div>
                <div>
                  <span className="text-[10px] font-mono text-ink-subtle block uppercase">Final Delivery</span>
                  <p className="font-bold text-sm text-ink">{destination.trim() || "Pending Destination"}</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-elevated border border-border/60 flex items-start gap-2.5 text-xs text-ink-muted">
              <ShieldCheck className="w-4 h-4 text-signal-aqua shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Once saved, the optimization engine continuously scans this corridor for load overlap candidates.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddRoute;
