import { useState } from "react";
import { useDispatch } from "react-redux";
import UserCard from "./UserCard";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { addUser } from "../utils/userSlice";
import { UserCog, CheckCircle2 } from "lucide-react";

const EditProfile = ({ user }) => {
  const [name, setName] = useState(user.name || "");
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || "");
  const [emailId, setEmailId] = useState(user.emailId || "");

  const isTrader = user.aadharNumber !== undefined;

  const [address, setAddress] = useState(user.address || "");
  const [registrationNumber, setRegistrationNumber] = useState(user.registrationNumber || "");
  const [aadharNumber, setAadharNumber] = useState(user.aadharNumber || "");

  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const [showToast, setShowToast] = useState(false);

  const saveProfile = async () => {
    try {
      setError("");
      let payload = isTrader
        ? { name, photoUrl, aadharNumber, emailId }
        : { name, photoUrl, address, registrationNumber, emailId };

      let res;
      if (isTrader) {
        res = await axios.put(BASE_URL + "/profile/traderEdit", payload, { withCredentials: true });
      } else {
        res = await axios.put(BASE_URL + "/profile/companyEdit", payload, { withCredentials: true });
      }
      dispatch(addUser(res.data.data));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setError(err.response?.data || "An error occurred.");
    }
  };

  const previewUser = isTrader
    ? { name, photoUrl, aadharNumber, emailId }
    : { name, photoUrl, address, registrationNumber, emailId };

  return (
    <>
      <div className="min-h-screen py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <UserCog className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase mb-2">Account</p>
            <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
            <p className="text-white/40 mt-1 text-sm">Update your personal information</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Edit Form */}
            <div className="flex-1 p-8 rounded-2xl bg-white/3 border border-white/5 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-2">Profile Information</h2>

              <div>
                <label className="text-sm font-medium text-white/60 block mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white/60 block mb-1.5">Photo URL</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white/60 block mb-1.5">Email</label>
                <input
                  type="text"
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              {isTrader ? (
                <div>
                  <label className="text-sm font-medium text-white/60 block mb-1.5">Aadhar Number</label>
                  <input
                    type="text"
                    value={aadharNumber}
                    onChange={(e) => setAadharNumber(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-white/60 block mb-1.5">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white/60 block mb-1.5">Registration Number</label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {typeof error === "string" ? error : JSON.stringify(error)}
                </p>
              )}

              <button
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl py-3 px-4 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 mt-2"
                onClick={saveProfile}
              >
                Save Profile
              </button>
            </div>

            {/* Live Preview Card */}
            <div className="lg:w-72">
              <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-3 text-center">Live Preview</p>
              <UserCard user={previewUser} />
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/10 backdrop-blur-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 text-sm font-medium">Profile saved successfully.</span>
        </div>
      )}
    </>
  );
};

export default EditProfile;
