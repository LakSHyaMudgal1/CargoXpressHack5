import { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { PackagePlus } from "lucide-react";

const AddTraderRequest = () => {
  const [load, setLoad] = useState([""]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState([""]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const addLoad = () => {
    setLoad([...load, ""]);
  };

  const updateLoad = (index, value) => {
    const updatedLoad = [...load];
    updatedLoad[index] = value;
    setLoad(updatedLoad);
  };

  const addStop = () => {
    setStops([...stops, ""]);
  };

  const updateStops = (index, value) => {
    const updatedStops = [...stops];
    updatedStops[index] = value;
    setStops(updatedStops);
  };

  const handleAddRequest = async () => {
    try {
      setError("");
      setSuccessMessage("");

      const res = await axios.post(
        `${BASE_URL}/scheduleDelivery/traderRequest`,
        {
          load: load.map(Number),
          source,
          destination,
          stops: stops.filter(stop => stop.trim() !== ""),
        },
        { withCredentials: true }
      );

      if (res.status === 200 || res.status === 201) {
        setSuccessMessage("Trader request added successfully!");
        setLoad([""]);
        setSource("");
        setDestination("");
        setStops([""]);
      }
    } catch (err) {
      console.log(err);
      setError(err.response?.data || "Something went wrong");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <PackagePlus className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Trader Portal</p>
          <h1 className="text-3xl font-bold text-white">Add Delivery Details</h1>
          <p className="text-white/40 mt-1 text-sm">Submit your delivery request for scheduling</p>
        </div>

        <div className="p-8 rounded-2xl bg-white/3 border border-white/5 space-y-5">
          {/* Load at Each Stop */}
          <div>
            <label className="text-xs font-semibold text-emerald-400 tracking-widest uppercase block mb-3">
              Load at Each Stop
            </label>
            <div className="space-y-2">
              {load.map((l, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Enter Load (kg)"
                    value={l}
                    onChange={(e) => updateLoad(index, e.target.value)}
                    className="flex-1 bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  {index === load.length - 1 && (
                    <button
                      onClick={addLoad}
                      className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-white/60 text-xl font-bold hover:bg-white/8 hover:border-white/15 hover:text-white transition-all"
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="text-sm font-medium text-white/60 block mb-1.5">Source</label>
            <input
              type="text"
              placeholder="Enter Source"
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
              placeholder="Enter Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Stops */}
          <div>
            <label className="text-xs font-semibold text-emerald-400 tracking-widest uppercase block mb-3">
              Intermediate Stops
            </label>
            <div className="space-y-2">
              {stops.map((stop, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter Stop Name"
                    value={stop}
                    onChange={(e) => updateStops(index, e.target.value)}
                    className="flex-1 bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  {index === stops.length - 1 && (
                    <button
                      onClick={addStop}
                      className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-white/60 text-xl font-bold hover:bg-white/8 hover:border-white/15 hover:text-white transition-all"
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {successMessage && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">{successMessage}</p>
          )}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{typeof error === "string" ? error : JSON.stringify(error)}</p>
          )}

          <button
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl py-3 px-4 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
            onClick={handleAddRequest}
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTraderRequest;
