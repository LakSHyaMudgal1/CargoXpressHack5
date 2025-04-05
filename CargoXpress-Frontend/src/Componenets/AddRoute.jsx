import { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";

const AddRoute = () => {
  const [uistops, setUiStops] = useState(["Stop-1"]); // UI stops (labels)
  const [licensePlate, setLicensePlate] = useState("1234");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState([]); // User-entered stops
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // ✅ Success message state

  // Add a new stop dynamically
  const addStop = () => {
    if (uistops.length < 10) {
      setUiStops([...uistops, `Stop-${uistops.length + 1}`]);
      setStops([...stops, ""]); // Add empty input for new stop
    }
  };

  // Update stops when input changes
  const updateStops = (index, value) => {
    const updatedStops = [...stops];
    updatedStops[index] = value;
    setStops(updatedStops);
  };

  // API call to add route
  const handleAddRoute = async () => {
    try {
      setError(""); // ✅ Clear error before making API call
      setSuccessMessage(""); // ✅ Clear previous success message

      const res = await axios.post(
        BASE_URL + "/scheduleDelivery/addroute",
        { licensePlate, source, destination, stops },
        { withCredentials: true }
      );

      console.log("Route Added:", res.data);

      // ✅ Show success message only on successful response
      if (res.status === 200 || res.status === 201) {
        setSuccessMessage("Route added successfully!");
      }
    } catch (err) {
      console.log(err);
      setError(err.response?.data || "Something went wrong");
    }
  };

  return (
    <div id="route" className="flex justify-center items-center min-h-screen p-10">
      <div className="p-8 rounded-lg shadow-lg w-[500px] bg-gray-800">
        <h1 className="text-center text-white text-2xl font-bold mb-6">Add Route</h1>

        {/* License Plate Input */}
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-white">License Plate</span>
          </div>
          <input
            type="text"
            placeholder="Type here"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            className="input input-bordered w-full"
          />
        </label>

        {/* Source Input */}
        <label className="form-control w-full mt-4">
          <div className="label">
            <span className="label-text text-white">Source</span>
          </div>
          <input
            type="text"
            placeholder="Type here"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="input input-bordered w-full"
          />
        </label>

        {/* Destination Input */}
        <label className="form-control w-full mt-4">
          <div className="label">
            <span className="label-text text-white">Destination</span>
          </div>
          <input
            type="text"
            placeholder="Type here"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="input input-bordered w-full"
          />
        </label>

        {/* Stops Section */}
        <span className="label-text text-white mt-6 block">Enter Names of Stops</span>
        <ul className="timeline timeline-vertical mt-4">
          {uistops.map((uistop, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="timeline-start text-white w-20">{uistop}</div>
              <div className="timeline-middle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-green-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="timeline-end timeline-box w-full flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter Stop Name"
                  value={stops[index]}
                  onChange={(e) => updateStops(index, e.target.value)}
                  className="input input-bordered w-full"
                />

                {/* Circular + Button to Add More Stops */}
                {index === uistops.length - 1 && uistops.length < 10 && (
                  <button
                    onClick={addStop}
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 text-xl font-bold hover:bg-gray-600 transition"
                  >
                    +
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Submit Button */}
        <button className="btn btn-success w-full mt-6" onClick={handleAddRoute}>
          Add
        </button>

        {/* Success Message - ✅ Shows only on successful response */}
        {successMessage && <p className="text-green-400 text-center mt-4">{successMessage}</p>}

        {/* Error Message Display */}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default AddRoute;
