import React from "react";
import { Building2, Hash, MapPin, Mail } from "lucide-react";

const CompanyCard = ({ imageUrl, name, registrationNo, address, email }) => {
  return (
    <div className="w-80 bg-gray-800 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden border border-gray-700">
      <div className="relative w-full h-48 group">
        <img
          src={imageUrl || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"}
          alt={`${name} office`}
          className="w-full h-full object-cover group-hover:scale-100 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-100">{name}</h3>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center text-gray-400 hover:text-gray-200 transition-colors">
            <Hash className="w-4 h-4 mr-3 text-blue-400" />
            <span>{registrationNo}</span>
          </div>
          
          <div className="flex items-start text-gray-400 hover:text-gray-200 transition-colors">
            <MapPin className="w-4 h-4 mr-3 mt-1 text-blue-400 shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>
          
          <div className="flex items-center">
            <Mail className="w-4 h-4 mr-3 text-blue-400" />
            <a 
              href={`mailto:${email}`} 
              className="text-blue-400 hover:text-blue-300 transition-colors hover:underline"
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
