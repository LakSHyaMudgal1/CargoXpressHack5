import React, { useEffect, useState } from "react";
import { User, Hash, Mail } from "lucide-react";
import TraderCard from "./TraderCard";
import { BASE_URL } from "../utils/constants";

const TraderList = () => {
    const [traders, setTraders] = useState([]);
  
    useEffect(() => {
      fetch(BASE_URL+ "/viewTrader")
        .then((response) => response.json())
        .then((data) => setTraders(data))
        .catch((error) => console.error("Error fetching traders:", error));
    }, []);
  
    return (
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 ">
        {traders.map((trader) => (
          <TraderCard 
            key={trader._id} 
            name={trader.name} 
            emailId={trader.emailId} 
            photoUrl={trader.photoUrl} 
            aadharNumber={trader.aadharNumber} 
          />
        ))}
      </div>
    );
  };
  
export default TraderList;