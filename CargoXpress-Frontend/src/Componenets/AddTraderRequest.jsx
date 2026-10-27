import React, { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useNavigate, Link } from "react-router-dom";
import {
  Boxes,
  MapPin,
  ArrowRight,
  Plus,
  X,
  ShieldCheck,
  Package
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";
import { calculateRequiredCapacity } from "../utils/capacityCalculation";

const AddTraderRequest = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState([""]);
  const [load, setLoad] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const addLoad = () => {
    setLoad([...load, ""]);
  };

  const removeLoad = (index) => {
    if (load.length > 1) {
      setLoad(load.filter((_, i) => i !== index));
    }
  };

  const updateLoad = (index, value) => {
    const updated = [...load];
    updated[index] = value;
    setLoad(updated);
  };

  const addStop = () => {
    if (stops.length < 8) {
      setStops([...stops, ""]);
    }
  };

  const removeStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const updateStops = (index, value) => {
    const updated = [...stops];
    updated[index] = value;
    setStops(updated);
  };

  const requiredCapacity = calculateRequiredCapacity(load);

  const handleAddRequest = async (e) => {
    e?.preventDefault();
    if (!source.trim() || !destination.trim()) {
      setError("Origin pickup location and delivery destination are required.");
      return;
    }

    const cleanLoads = load.map((n) => (n === "" || n === null || n === undefined ? NaN : Number(n)));
    if (cleanLoads.some((n) => isNaN(n) || n <= 0)) {
      setError("Please specify valid positive cargo load requirements (greater than 0 kg) for each stop.");
      return;
    }

    const calculatedCap = calculateRequiredCapacity(cleanLoads);
    if (!calculatedCap || calculatedCap <= 0) {
      setError("Please specify at least one valid stop load requirement greater than 0 kg.");
      return;
    }

    const cleanStops = stops.map((s) => s.trim()).filter(Boolean);

    try {
      setLoading(true);
      setError("");

      await axios.post(
        `${BASE_URL}/scheduleDelivery/traderRequest`,
        {
          source: source.trim(),
          destination: destination.trim(),
          load: cleanLoads,
          stops: cleanStops,
        },
        { withCredentials: true }
      );

      showToast(
        "success",
        "Consignment Registered",
        `Delivery request with required capacity of ${calculatedCap.toLocaleString()} kg (${source} → ${destination}) submitted successfully.`
      );

      navigate("/trader");
    } catch (err) {
      console.error("Trader request submit error:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to submit request.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Consignor Cargo Hub"
        title="Post Consignment Delivery Request"
        description="Specify cargo load weights and origin-to-destination corridors. CargoXpress matches your consignment with moving carrier trucks along identical routes."
        badge={<Badge variant="emerald" dot>Consignment Entry</Badge>}
        breadcrumbs={[
          { label: "Consignments", href: "/trader" },
          { label: "Request Delivery" },
        ]}
      />

      {error && (
        <div className="p-4 rounded-lg bg-signal-coral/10 border border-signal-coral/20 text-signal-coral text-xs">
          {error}
        </div>
      )}

      {/* 2. Main Form & Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-section Request Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleAddRequest} className="space-y-6 text-xs">
            {/* Section 1: Pickup and Destination */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                <MapPin className="w-4 h-4 text-signal-emerald" />
                <h3 className="text-sm font-bold text-ink">1. Pickup & Delivery Terminal</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                    Pickup Location (Source) *
                  </label>
                  <Input
                    placeholder="e.g. Pune"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold block mb-1.5">
                    Destination Terminal *
                  </label>
                  <Input
                    placeholder="e.g. Hyderabad"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Section 2: Intermediate Drop-offs / Waypoints */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-signal-aqua" />
                  <h3 className="text-sm font-bold text-ink">2. Intermediate Waypoints (Optional)</h3>
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

              <p className="text-[11px] text-ink-subtle">
                Add intermediate drop-off or pickup cities along your consignment corridor if applicable.
              </p>

              <div className="space-y-2">
                {stops.map((stopCity, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-subtle w-20">Stop {sIdx + 1}:</span>
                    <Input
                      placeholder="e.g. Solapur"
                      value={stopCity}
                      onChange={(e) => updateStops(sIdx, e.target.value)}
                      className="flex-1"
                    />
                    {stops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStop(sIdx)}
                        className="p-2 text-ink-subtle hover:text-signal-coral rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Section 3: Stop-Level Cargo Load Requirements */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-signal-emerald" />
                  <div>
                    <h3 className="text-sm font-bold text-ink">3. Stop Load Requirements</h3>
                    <p className="text-[11px] text-ink-subtle mt-0.5">
                      Enter the required cargo capacity at each stop. Required truck capacity is determined by the peak requirement (maximum across stops), not by summing them.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addLoad}
                  className="text-xs h-7 text-signal-emerald shrink-0"
                  leftIcon={Plus}
                >
                  Add Stop Requirement
                </Button>
              </div>

              <div className="space-y-2">
                {load.map((weightVal, lIdx) => (
                  <div key={lIdx} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-subtle w-28">Stop {lIdx + 1} Load:</span>
                    <Input
                      type="number"
                      placeholder="Required capacity in kg (e.g. 2500)"
                      value={weightVal}
                      onChange={(e) => updateLoad(lIdx, e.target.value)}
                      min="1"
                      className="flex-1"
                      required
                    />
                    {load.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLoad(lIdx)}
                        className="p-2 text-ink-subtle hover:text-signal-coral rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Submit Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link to="/trader">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" type="submit" isLoading={loading} rightIcon={ArrowRight}>
                Submit Consignment Request
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Summary Review Card */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 space-y-4 sticky top-24">
            <span className="text-[10px] uppercase font-mono tracking-wider text-signal-emerald font-semibold block">
              Consignment Review
            </span>

            {/* Corridor summary */}
            <div className="p-4 rounded-lg bg-surface-elevated border border-border space-y-3">
              <div>
                <span className="text-[10px] font-mono text-ink-subtle uppercase block">Delivery Route</span>
                <p className="font-bold text-sm text-ink mt-0.5">
                  {source.trim() || "Origin"} <span className="text-ink-subtle">→</span> {destination.trim() || "Destination"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-ink-subtle block">Required Capacity</span>
                  <span className="font-bold text-sm text-signal-emerald">
                    {requiredCapacity > 0 ? `${requiredCapacity.toLocaleString()} kg` : "— kg"}
                  </span>
                  <span className="text-[9px] text-ink-subtle block font-sans">
                    Peak stop requirement
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-subtle block">Waypoints</span>
                  <span className="font-bold text-sm text-ink">
                    {stops.filter((s) => s.trim()).length} Intermediate
                  </span>
                </div>
              </div>
            </div>

            {/* Automated consolidation benefit note */}
            <div className="p-4 rounded-lg bg-surface/50 border border-border/60 space-y-2 text-xs text-ink-muted">
              <div className="flex items-center gap-2 text-ink font-semibold">
                <ShieldCheck className="w-4 h-4 text-signal-emerald" />
                <span>Smart Load Merging</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your consignment request is immediately queued in the Algorithmic Trader Merge Pool. Trucks already scheduled on this corridor will absorb your cargo, significantly reducing your per-ton transport cost.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddTraderRequest;
