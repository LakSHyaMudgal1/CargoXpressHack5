import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import Body from "./Componenets/Body";
import Home from "./Componenets/Home";
import Login from "./Componenets/Login";
import appStore from "./utils/appStore";
import { ToastProvider } from "./components/ui/Toast";
import ThemeProvider from "./Componenets/ThemeProvider";
import { Skeleton } from "./components/ui/Skeleton";

// Route-based code splitting for heavier operational workspaces
const AdminDashboard = lazy(() => import("./Componenets/AdminDashboard"));
const CompanyDashboard = lazy(() => import("./Componenets/CompanyDashboard"));
const TraderDashboard = lazy(() => import("./Componenets/TraderDashboard"));
const MergedSchedule = lazy(() => import("./Componenets/MergedSchedule"));
const MergeableSchedule = lazy(() => import("./Componenets/MergeableSchedule"));
const Truck = lazy(() => import("./Componenets/Truck"));
const AddRoute = lazy(() => import("./Componenets/AddRoute"));
const Profile = lazy(() => import("./Componenets/Profile"));
const AddTraderRequest = lazy(() => import("./Componenets/AddTraderRequest"));
const TraderList = lazy(() => import("./Componenets/TraderList"));
const TraderCard = lazy(() => import("./Componenets/TraderCard"));
const MergeableTraders = lazy(() => import("./Componenets/MergableTraders"));

const RouteFallback = () => (
  <div className="cx-page-container py-8 space-y-6">
    <div className="flex items-center justify-between pb-4 border-b border-border">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-9 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
    <Skeleton className="h-80 rounded-xl" />
  </div>
);

function App() {
  return (
    <Provider store={appStore}>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter basename="/">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Standalone — no navbar/footer */}
                <Route path="/login" element={<Login />} />

                {/* All other routes get the Body layout */}
                <Route path="/" element={<Body />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/company" element={<CompanyDashboard />} />
                  <Route path="/trader" element={<TraderDashboard />} />
                  <Route path="/truck" element={<Truck />} />
                  <Route path="/route" element={<AddRoute />} />
                  <Route path="/mergedSchedule" element={<MergedSchedule />} />
                  <Route path="/mergeable" element={<MergeableSchedule />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/traderRequest" element={<AddTraderRequest />} />
                  <Route path="/traderList" element={<TraderList />} />
                  <Route path="/traderCard" element={<TraderCard />} />
                  <Route path="/mergeableTraders" element={<MergeableTraders />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
