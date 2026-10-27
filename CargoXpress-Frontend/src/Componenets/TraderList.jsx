import React, { useEffect, useState } from "react";
import TraderCard from "./TraderCard";
import { BASE_URL } from "../utils/constants";
import { CardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { Users } from "lucide-react";

const TraderList = ({ searchQuery = '' }) => {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(BASE_URL + "/viewTrader")
      .then((response) => response.json())
      .then((data) => {
        setTraders(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error("Error fetching traders:", error))
      .finally(() => setLoading(false));
  }, []);

  const filteredTraders = traders.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.emailId && t.emailId.toLowerCase().includes(q)) ||
      (t.aadharNumber && String(t.aadharNumber).includes(q))
    );
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (filteredTraders.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No consignor traders found"
        description={searchQuery ? `No traders match "${searchQuery}".` : "No registered traders currently in the system."}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredTraders.map((trader) => (
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
