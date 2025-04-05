import { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";

const AddTraderRequest = () => {
  const [traderId, setTraderId] = useState("");
  const [load, setLoad] = useState([""]); // Array for numeric inputs
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState([""]); // Array for stop names
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
          traderId,
          load: load.map(Number), // Convert load values to numbers
          source,
          destination,
          stops: stops.filter(stop => stop.trim() !== ""), // Remove empty stops
        },
        { withCredentials: true }
      );

      if (res.status === 200 || res.status === 201) {
        setSuccessMessage("Trader request added successfully!");
        setTraderId("");
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
    <div className="flex justify-center items-center min-h-screen p-10">
      <div className="p-8 rounded-lg shadow-lg w-[500px] bg-gray-800">
        <h1 className="text-center text-white text-2xl font-bold mb-6">Add Delivery Details</h1>



        <span className="label-text text-white mt-6 block">Load at Each Stop</span>
        {load.map((l, index) => (
          <div key={index} className="flex items-center gap-2 mt-2">
            <input
              type="number"
              placeholder="Enter Load"
              value={l}
              onChange={(e) => updateLoad(index, e.target.value)}
              className="input input-bordered w-full"
            />
            {index === load.length - 1 && (
              <button
                onClick={addLoad}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 text-xl font-bold hover:bg-gray-600 transition"
              >
                +
              </button>
            )}
          </div>
        ))}

        <label className="form-control w-full mt-4">
          <div className="label">
            <span className="label-text text-white">Source</span>
          </div>
          <input
            type="text"
            placeholder="Enter Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="input input-bordered w-full"
          />
        </label>

        <label className="form-control w-full mt-4">
          <div className="label">
            <span className="label-text text-white">Destination</span>
          </div>
          <input
            type="text"
            placeholder="Enter Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="input input-bordered w-full"
          />
        </label>

        <span className="label-text text-white mt-6 block">Enter Stops</span>
        {stops.map((stop, index) => (
          <div key={index} className="flex items-center gap-2 mt-2">
            <input
              type="text"
              placeholder="Enter Stop Name"
              value={stop}
              onChange={(e) => updateStops(index, e.target.value)}
              className="input input-bordered w-full"
            />
            {index === stops.length - 1 && (
              <button
                onClick={addStop}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 text-xl font-bold hover:bg-gray-600 transition"
              >
                +
              </button>
            )}
          </div>
        ))}

        <button className="btn btn-success w-full mt-6" onClick={handleAddRequest}>
          Submit
        </button>

        {successMessage && <p className="text-green-400 text-center mt-4">{successMessage}</p>}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default AddTraderRequest;
