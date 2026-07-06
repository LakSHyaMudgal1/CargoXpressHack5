import React from "react";
import { Building2, Hash, MapPin, Mail } from "lucide-react";

const CompanyCard = ({ imageUrl, name, registrationNo, address, email }) => {
  return (
    <div className="rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all overflow-hidden">
      <div className="relative w-full h-44 group">
        <img
          src={imageUrl || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"}
          alt={`${name} office`}
          className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h3 className="text-base font-semibold text-white truncate">{name}</h3>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center text-white/40 hover:text-white/70 transition-colors">
            <Hash className="w-4 h-4 mr-3 text-emerald-400/60 flex-shrink-0" />
            <span className="truncate">{registrationNo}</span>
          </div>

          <div className="flex items-start text-white/40 hover:text-white/70 transition-colors">
            <MapPin className="w-4 h-4 mr-3 mt-0.5 text-emerald-400/60 flex-shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>

          <div className="flex items-center">
            <Mail className="w-4 h-4 mr-3 text-emerald-400/60 flex-shrink-0" />
            <a
              href={`mailto:${email}`}
              className="text-emerald-400 hover:text-emerald-300 transition-colors hover:underline truncate"
            >
              {email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyCard;
