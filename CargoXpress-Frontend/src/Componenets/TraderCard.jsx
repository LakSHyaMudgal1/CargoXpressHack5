import React from "react";
import { User, Hash, Mail } from "lucide-react";

const TraderCard = ({ name, emailId, photoUrl, aadharNumber }) => {
  return (
    <div className="rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all overflow-hidden">
      <div className="relative w-full h-44 group">
        <img
          src={photoUrl || "https://cdn-icons-png.flaticon.com/256/149/149071.png"}
          alt={`${name} profile`}
          className="w-full h-full object-contain bg-white/3 group-hover:scale-100 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h3 className="text-base font-semibold text-white truncate">{name}</h3>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center text-white/40 hover:text-white/70 transition-colors">
            <Hash className="w-4 h-4 mr-3 text-emerald-400/60 flex-shrink-0" />
            <span>{aadharNumber}</span>
          </div>

          <div className="flex items-center">
            <Mail className="w-4 h-4 mr-3 text-emerald-400/60 flex-shrink-0" />
            <a
              href={`mailto:${emailId}`}
              className="text-emerald-400 hover:text-emerald-300 transition-colors hover:underline truncate"
            >
              {emailId}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraderCard;
