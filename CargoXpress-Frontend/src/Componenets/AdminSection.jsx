import React from 'react';
import { Calendar, CalendarClock } from 'lucide-react';
import { Link } from 'react-router';

const AdminSection = () => {
  return (
    <div className="h-[150px] text-gray-300 min-h-screen p-6">
      <div className="max-w-7xl mx-auto py-12">
        <div className="grid grid-cols-3 gap-6">
         <Link to="/mergeable"><button
            className="group w-[400px] relative overflow-hidden rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none"
            onClick={() => console.log('Mergeable Schedule clicked')}
          >
            <div className="relative rounded-2xl bg-gray-800 px-8 py-6 transition-all duration-300 group-hover:bg-gray-700">
              <div className="flex items-center justify-center space-x-4">
                <Calendar className="h-8 w-8 text-emerald-400" />
                <span className="text-xl font-semibold text-white">
                  Mergeable Schedule
                </span>
              </div>
              <div className="mt-2 text-center text-sm text-gray-400">
                Create new mergeable schedules
              </div>
            </div>
          </button></Link> 
         <Link to="/mergedSchedule">
          <button
            className="group w-[400px] relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25 focus:outline-none"
            onClick={() => console.log('Merge Schedules clicked')}
          >
            <div className="relative rounded-2xl bg-gray-800 px-8 py-6 transition-all duration-300 group-hover:bg-gray-700">
              <div className="flex items-center justify-center space-x-4">
                <CalendarClock className="h-8 w-8 text-emerald-400" />
                <span className="text-xl font-semibold text-white">
                  Merged Schedules
                </span>
              </div>
              <div className="mt-2 text-center text-sm text-gray-400">
                Combine multiple schedules
              </div>
            </div>
          </button></Link>
          <Link to="/mergeableTraders"><button
            className="group w-[400px] relative overflow-hidden rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white p-0.5 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none"
            onClick={() => console.log('Mergeable Schedule clicked')}
          >
            <div className="relative rounded-2xl bg-gray-800 px-8 py-6 transition-all duration-300 group-hover:bg-gray-700">
              <div className="flex items-center justify-center space-x-4">
                <Calendar className="h-8 w-8 text-emerald-400" />
                <span className="text-xl font-semibold text-white">
                  Mergeable for Traders
                </span>
              </div>
              <div className="mt-2 text-center text-sm text-gray-400">
                Find new mergeable schedules for Traders
              </div>
            </div>
          </button></Link> 
        </div>
      </div>
    </div>
  );
};

export default AdminSection;
