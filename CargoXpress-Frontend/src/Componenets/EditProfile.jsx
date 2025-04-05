import { useState } from "react";
import { useDispatch } from "react-redux";
import UserCard from "./UserCard";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { addUser } from "../utils/userSlice";

const EditProfile = ({ user }) => {
  const [name, setName] = useState(user.name || "");
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || "");
  const [emailId, setEmailId] = useState(user.emailId || "");
  
  // Check if the user is a trader
  const isTrader = user.aadharNumber !== undefined;

  const [address, setAddress] = useState(user.address || "");
  const [registrationNumber, setRegistrationNumber] = useState(user.registrationNumber || "");
  const [aadharNumber, setAadharNumber] = useState(user.aadharNumber || "");

  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const [showToast, setShowToast] = useState(false);

  const saveProfile = async () => {
    try {
      let payload = isTrader
        ? { name, photoUrl, aadharNumber, emailId }
        : { name, photoUrl, address, registrationNumber, emailId };
  
        let res;
        if (isTrader) {
          res = await axios.put(BASE_URL + "/profile/traderEdit", payload, { withCredentials: true });
        } else {
          res = await axios.put(BASE_URL + "/profile/companyEdit", payload, { withCredentials: true });
        }
      dispatch(addUser(res?.data?.data));
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err) {
      setError(err.response?.data || "An error occurred.");
    }
  };

  return (
    <>
      <div className="flex justify-center my-10">
        <div className="flex justify-center mx-10">
          <div className="card bg-base-300 w-96 shadow-xl">
            <div className="card-body">
              <h2 className="card-title justify-center">Edit Profile</h2>
              <div>
                <label className="form-control w-full max-w-xs my-2">
                  <div className="label">
                    <span className="label-text">Name:</span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    className="input input-bordered w-full max-w-xs"
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="form-control w-full max-w-xs my-2">
                  <div className="label">
                    <span className="label-text">Photo URL:</span>
                  </div>
                  <input
                    type="text"
                    value={photoUrl}
                    className="input input-bordered w-full max-w-xs"
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                </label>

                <label className="form-control w-full max-w-xs my-2">
                  <div className="label">
                    <span className="label-text">Email Id:</span>
                  </div>
                  <input
                    type="text"
                    value={emailId}
                    className="input input-bordered w-full max-w-xs"
                    onChange={(e) => setEmailId(e.target.value)}
                  />
                </label>

                {isTrader ? (
                  <>
                    <label className="form-control w-full max-w-xs my-2">
                      <div className="label">
                        <span className="label-text">Aadhar Number:</span>
                      </div>
                      <input
                        type="text"
                        value={aadharNumber}
                        className="input input-bordered w-full max-w-xs"
                        onChange={(e) => setAadharNumber(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="form-control w-full max-w-xs my-2">
                      <div className="label">
                        <span className="label-text">Address:</span>
                      </div>
                      <input
                        type="text"
                        value={address}
                        className="input input-bordered w-full max-w-xs"
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </label>

                    <label className="form-control w-full max-w-xs my-2">
                      <div className="label">
                        <span className="label-text">Registration Number:</span>
                      </div>
                      <input
                        type="text"
                        value={registrationNumber}
                        className="input input-bordered w-full max-w-xs"
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>

              <p className="text-red-500">{error}</p>
              <div className="card-actions justify-center m-2">
                <button className="btn btn-primary" onClick={saveProfile}>
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        <UserCard
          user={
            isTrader
              ? { name, photoUrl, aadharNumber, emailId }
              : { name, photoUrl, address, registrationNumber, emailId }
          }
        />
      </div>

      {showToast && (
        <div className="toast toast-top toast-center">
          <div className="alert alert-success">
            <span>Profile saved successfully.</span>
          </div>
        </div>
      )}
    </>
  );
};

export default EditProfile;
