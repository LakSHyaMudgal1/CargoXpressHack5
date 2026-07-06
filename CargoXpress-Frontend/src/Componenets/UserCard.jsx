import React from "react";
import { MdEmail, MdLocationOn } from "react-icons/md";
import { FaIdCard } from "react-icons/fa";
import { BiUser } from "react-icons/bi";

const UserProfileCard = ({ user }) => {
  const { name, emailId, photoUrl, address, registrationNumber, aadharNumber } = user;
  const isTrader = aadharNumber !== undefined;

  return (
    <div className="flex-1 min-w-0">
      <div className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all">
        {/* Profile Photo */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full border-2 border-emerald-500/30 overflow-hidden bg-white/5">
            <img
              src={photoUrl || "https://cdn-icons-png.flaticon.com/256/149/149071.png"}
              alt={`${name}'s profile photo`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name */}
        <h2 className="text-xl font-bold text-white text-center mb-1">{name}</h2>
        <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase text-center mb-6">
          {isTrader ? "Trader" : "Transport Company"}
        </p>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
            <MdEmail className="text-lg text-emerald-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-white/60 text-sm truncate">{emailId}</span>
          </div>

          {isTrader ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
              <FaIdCard className="text-lg text-emerald-400 flex-shrink-0" aria-hidden="true" />
              <span className="text-white/60 text-sm">{aadharNumber}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <MdLocationOn className="text-lg text-emerald-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-white/60 text-sm">{address}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <FaIdCard className="text-lg text-emerald-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-white/60 text-sm">{registrationNumber}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
