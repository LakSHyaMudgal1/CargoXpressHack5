import { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import { Truck as TruckIcon, CheckCircle2 } from "lucide-react";

const Truck = () => {
  const [stops, setStops] = useState(["Stop-1"]);
  const [licensePlate, setLicensePlate] = useState("");
  const [totalCapacity, setTotalCapacity] = useState("");
  const [currentLoad, setCurrentLoad] = useState([""]);
  const [error, setError] = useState("");
  const [plateError, setPlateError] = useState("");
  const [plateChecking, setPlateChecking] = useState(false);
  const [plateExists, setPlateExists] = useState(false);
  const navigate = useNavigate();

  const addStop = () => {
    if (stops.length < 10) {
      setStops([...stops, `Stop-${stops.length + 1}`]);
      setCurrentLoad([...currentLoad, ""]);
    }
  };

  const updateCurrentLoad = (index, value) => {
    const updated = [...currentLoad];
    updated[index] = value;
    setCurrentLoad(updated);
  };

  const handlePlateBlur = async () => {
    if (!licensePlate.trim()) return;
    setPlateChecking(true);
    setPlateError("");
    try {
      const res = await axios.get(
        BASE_URL + "/scheduleDelivery/checkplate?licensePlate=" + encodeURIComponent(licensePlate),
        { withCredentials: true }
      );
      if (res.data.exists) {
        setPlateError("This license plate is already registered.");
        setPlateExists(true);
      } else {
        setPlateError("");
        setPlateExists(false);
      }
    } catch (err) {
      setPlateExists(false);
    } finally {
      setPlateChecking(false);
    }
  };

  const handleAddTruck = async () => {
    if (plateExists) return;
    try {
      setError("");
      const parsedCapacity = Number(totalCapacity);
      const parsedLoad = currentLoad.map(Number);

      const res = await axios.post(
        BASE_URL + "/scheduleDelivery/addtruck",
        { licensePlate, totalCapacity: parsedCapacity, currentLoad: parsedLoad },
        { withCredentials: true }
      );

      navigate('/route', {
        state: {
          licensePlate,
          totalCapacity: parsedCapacity,
          currentLoad: parsedLoad,
          remainingLoad: parsedLoad.map(l => parsedCapacity - l),
          stops,
        }
      });
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data
        || err.message
        || "Something went wrong";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const capacity = Number(totalCapacity) || 0;

  return (
    <div className="flex justify-center items-center min-h-screen p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <TruckIcon className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Fleet Management</p>
          <h1 className="text-3xl font-bold text-white">Add Truck</h1>
          <p className="text-white/40 mt-1 text-sm">Register a new truck and its capacity details</p>
        </div>

        <div className="p-8 rounded-2xl bg-white/3 border border-white/5 space-y-5">
          {/* License Plate */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-white/60">License Plate</label>
              {plateChecking && <span className="text-xs text-white/30">Checking...</span>}
            </div>
            <input
              type="text"
              placeholder="e.g. MH12AB1234"
              value={licensePlate}
              onChange={(e) => { setLicensePlate(e.target.value); setPlateError(""); setPlateExists(false); }}
              onBlur={handlePlateBlur}
              className={`w-full bg-white/5 border text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none transition-all ${plateError ? "border-red-500/50 focus:border-red-500/70" : "border-white/8 focus:border-emerald-500/50"}`}
            />
            {plateError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-2">{plateError}</p>
            )}
          </div>

          {/* Total Capacity */}
          <div>
            <label className="text-sm font-medium text-white/60 block mb-1.5">Total Capacity (kg)</label>
            <input
              type="number"
              placeholder="e.g. 1000"
              value={totalCapacity}
              onChange={(e) => setTotalCapacity(e.target.value)}
              className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Stops — Current Load */}
          <div>
            <label className="text-xs font-semibold text-emerald-400 tracking-widest uppercase block mb-3">
              Current Load at Each Stop
            </label>
            <div className="space-y-3">
              {stops.map((stop, index) => {
                const load = Number(currentLoad[index]) || 0;
                const remaining = capacity - load;
                const isOver = load > capacity && capacity > 0;
                return (
                  <div key={index} className="p-4 rounded-xl bg-white/3 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-white/60 text-sm font-medium">{stop}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Current load (kg)"
                        value={currentLoad[index]}
                        onChange={(e) => updateCurrentLoad(index, e.target.value)}
                        className={`flex-1 bg-white/5 border text-white placeholder-white/20 rounded-xl py-2.5 px-3 focus:outline-none transition-all text-sm ${isOver ? "border-red-500/50 focus:border-red-500/70" : "border-white/8 focus:border-emerald-500/50"}`}
                      />
                      {index === stops.length - 1 && stops.length < 10 && (
                        <button
                          onClick={addStop}
                          className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-white/60 text-lg font-bold hover:bg-white/8 hover:border-white/15 hover:text-white transition-all"
                        >
                          +
                        </button>
                      )}
                    </div>
                    {capacity > 0 && (
                      <p className={`text-xs mt-2 ${isOver ? "text-red-400" : "text-emerald-400"}`}>
                        {isOver
                          ? `⚠ Exceeds capacity by ${load - capacity} kg`
                          : `${remaining} kg remaining`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl py-3 px-4 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-2"
            onClick={handleAddTruck}
            disabled={plateExists || plateChecking}
          >
            Add Truck &amp; Continue to Route
          </button>
        </div>
      </div>
    </div>
  );
};

export default Truck;
