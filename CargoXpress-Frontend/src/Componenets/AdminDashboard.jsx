import React, { useState, useEffect } from "react";
import CompanyCard from "./CompanyCard";
import axios from "axios";
import AdminSection from "./AdminSection";
import { BASE_URL } from "../utils/constants";
import TraderList from "./TraderList";
import { Building2, Users } from "lucide-react";

const AdminDashboard = () => {
  const [companies, setCompanies] = useState([]);

  const fetchCompany = async () => {
    try {
      const res = await axios.get(BASE_URL + "/viewCompany", {
        withCredentials: true,
      });
      console.log("API Response:", res.data);
      setCompanies(res.data);
    } catch (error) {
      console.error("Error fetching companies:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Admin Action Section */}
      <div className="border-b border-white/5">
        <AdminSection />
      </div>

      {/* Companies Section */}
      <main className="max-w-6xl mx-auto py-14 px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">Registry</p>
            <h2 className="text-2xl font-bold text-white">Featured Companies</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.length > 1 ? (
            companies.slice(1).map((company, index) => (
              <CompanyCard
                key={index + 1}
                imageUrl={company.photoUrl}
                name={company.name}
                registrationNo={company.registrationNumber}
                address={company.address}
                email={company.emailId}
              />
            ))
          ) : (
            <p className="text-white/40 text-center col-span-3 py-12">No companies found.</p>
          )}
        </div>
      </main>

      {/* Traders Section */}
      <main className="max-w-6xl mx-auto pb-14 px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">Registry</p>
            <h2 className="text-2xl font-bold text-white">Featured Traders</h2>
          </div>
        </div>
        <TraderList />
      </main>
    </div>
  );
};

export default AdminDashboard;
