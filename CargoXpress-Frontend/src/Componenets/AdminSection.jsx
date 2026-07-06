import React from 'react';
import { Calendar, CalendarClock, GitMerge } from 'lucide-react';
import { Link } from 'react-router';

const AdminSection = () => {
  return (
    <div className="bg-gray-950 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold text-emerald-400 tracking-widest uppercase text-center mb-2">Admin Controls</p>
        <h2 className="text-2xl font-bold text-white text-center mb-8">Schedule Management</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Mergeable Schedule */}
          <Link to="/mergeable" className="block group">
            <div className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/15 transition-colors">
                <Calendar className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Mergeable Schedule</h3>
              <p className="text-white/40 text-sm">Create new mergeable schedules</p>
              <div className="mt-4 text-xs text-emerald-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Open →
              </div>
            </div>
          </Link>

          {/* Merged Schedules */}
          <Link to="/mergedSchedule" className="block group">
            <div className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/15 transition-colors">
                <CalendarClock className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Merged Schedules</h3>
              <p className="text-white/40 text-sm">Combine multiple schedules</p>
              <div className="mt-4 text-xs text-emerald-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Open →
              </div>
            </div>
          </Link>

          {/* Mergeable for Traders */}
          <Link to="/mergeableTraders" className="block group">
            <div className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/15 transition-colors">
                <GitMerge className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Mergeable for Traders</h3>
              <p className="text-white/40 text-sm">Find new mergeable schedules for Traders</p>
              <div className="mt-4 text-xs text-emerald-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Open →
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSection;
