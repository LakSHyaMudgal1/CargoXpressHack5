import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import Body from "./Componenets/Body";
import Home from "./Componenets/Home";
import Login from "./Componenets/Login";
import appStore from "./utils/appStore";
import AdminDashboard from "./Componenets/AdminDashboard";
import MergedSchedule from "./Componenets/MergedSchedule";
import MergeableSchedule from "./Componenets/MergeableSchedule";
import Truck from "./Componenets/Truck";
import AddRoute from "./Componenets/AddRoute";
import Profile from "./Componenets/Profile";
import AddTraderRequest from "./Componenets/AddTraderRequest";
import TraderList from "./Componenets/TraderList";
import TraderCard from "./Componenets/TraderCard"
import MergeableTraders from "./Componenets/MergableTraders";



function App() {
  return (
    <Provider store={appStore}>
    <BrowserRouter basename="/">
    <Routes>
      <Route path="/" element={<Body/>}>
      <Route path="/" element={<Home/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/truck" element={<Truck/>}/>
      <Route path="/route" element={<AddRoute/>}/>
      <Route path="/admin" element={<AdminDashboard/>}/>
      <Route path="/mergedSchedule" element={<MergedSchedule/>}/>
      <Route path="/mergeable" element={<MergeableSchedule/>}/>
      <Route path="/profile" element={<Profile/>}/>
      <Route path="/traderRequest" element={<AddTraderRequest/>}/>
      <Route path="/traderList" element={<TraderList/>}/>
      <Route path="/traderCard" element={<TraderCard/>}/>
      <Route path="/mergeableTraders" element={<MergeableTraders/>}/>
      
      </Route>
    </Routes>
  </BrowserRouter>
  </Provider>

  )
}

export default App
