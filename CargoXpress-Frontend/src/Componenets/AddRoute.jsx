import { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, CheckCircle2, Route } from "lucide-react";

const AddRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const fromTruck = location.state || {};
  const truckCapacity    = fromTruck.totalCapacity  || null;
  const truckCurrentLoad = fromTruck.currentLoad    || [];
  const truckRemaining   = fromTruck.remainingLoad  || [];
  const truckStopLabels  = fromTruck.stops          || [];

  const [uistops, setUiStops] = useState(["Stop-1"]);
  const [licensePlate, setLicensePlate] = useState(fromTruck.licensePlate ?? "");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const addStop = () => {
    if (uistops.length < 10) {
      setUiStops([...uistops, `Stop-${uistops.length + 1}`]);
      setStops([...stops, ""]);
    }
  };

  const updateStops = (index, value) => {
    const updated = [...stops];
    updated[index] = value;
    setStops(updated);
  };

  const handleAddRoute = async () => {
    try {
      setError("");
      setSuccessMessage("");
      const res = await axios.post(
        BASE_URL + "/scheduleDelivery/addroute",
        { licensePlate, source, destination, stops },
        { withCredentials: true }
      );
      if (res.status === 200 || res.status === 201) {
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Something went wrong";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return (
    <div id="route" className="flex justify-center items-center min-h-screen p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Route className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Route Planning</p>
          <h1 className="text-3xl font-bold text-white">Add Route</h1>
          <p className="text-white/40 mt-1 text-sm">Define the delivery route for your truck</p>
        </div>

        <div className="p-8 rounded-2xl bg-white/3 border border-white/5 space-y-5">
          {/* Capacity summary panel */}
          {truckCapacity && (
            <div className="rounded-xl bg-white/3 border border-white/8 p-4">
              <p className="text-white/60 text-sm font-medium mb-3">
                Truck: <span className="text-white">{fromTruck.licensePlate}</span>
                <span className="ml-3 text-white/30">·</span>
                <span className="ml-3 text-white/60">Capacity: <span className="text-emerald-400">{truckCapacity} kg</span></span>
              </p>
              <div className="space-y-2">
                {truckStopLabels.map((label, i) => {
                  const remaining = truckRemaining[i] ?? (truckCapacity - (truckCurrentLoad[i] || 0));
                  const pct = Math.max(0, Math.round((remaining / truckCapacity) * 100));
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-white/30 text-xs w-16">{label}</span>
                      <div className="flex-1 bg-white/5 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct > 40 ? "bg-emerald-500" : pct > 15 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-20 text-right">{remaining} kg free</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* License Plate */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-white/60">License Plate</label>
              {fromTruck.licensePlate && (
                <span className="text-xs text-emerald-400">auto-filled</span>
              )}
            </div>
            <input
              type="text"
              placeholder="Enter license plate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              readOnly={!!fromTruck.licensePlate}
              className={`w-full border text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all ${fromTruck.licensePlate ? "bg-white/3 border-white/5 cursor-default text-white/50" : "bg-white/5 border-white/8"}`}
            />
          </div>

          {/* Source */}
          <div>
            <label className="text-sm font-medium text-white/60 block mb-1.5">Source</label>
            <input
              type="text"
              placeholder="Starting city / location"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="text-sm font-medium text-white/60 block mb-1.5">Destination</label>
            <input
              type="text"
              placeholder="End city / location"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Stops */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">Intermediate Stops</label>
              {truckStopLabels.length > 0 && (
                <span className="text-xs text-white/30">
                  Truck has <span className="text-emerald-400 font-semibold">{truckStopLabels.length}</span> stop{truckStopLabels.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {uistops.map((uistop, index) => {
                const stopRemaining = truckRemaining[index] ?? null;
                const stopLoad      = truckCurrentLoad[index] ?? null;
                const hasCapInfo    = truckCapacity && stopRemaining !== null;
                return (
                  <div key={index} className="p-4 rounded-xl bg-white/3 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-white/60 text-sm font-medium">{uistop}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Stop name"
                        value={stops[index] || ""}
                        onChange={(e) => updateStops(index, e.target.value)}
                        className="flex-1 bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-2.5 px-3 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
                      />
                      {index === uistops.length - 1 && uistops.length < 10 && (
                        <button
                          onClick={addStop}
                          className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-white/60 text-lg font-bold hover:bg-white/8 hover:border-white/15 hover:text-white transition-all"
                        >
                          +
                        </button>
                      )}
                    </div>
                    {hasCapInfo && (
                      <p className="text-xs mt-2 text-white/30">
                        Capacity: <span className="text-white">{truckCapacity} kg</span>
                        <span className="mx-1">·</span>
                        Used: <span className="text-yellow-400">{stopLoad} kg</span>
                        <span className="mx-1">·</span>
                        Free: <span className="text-emerald-400">{stopRemaining} kg</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {successMessage && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">{successMessage}</p>
          )}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl py-3 px-4 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 mt-2"
            onClick={handleAddRoute}
          >
            Add Route
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRoute;
