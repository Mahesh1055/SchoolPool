import { useEffect, useState } from "react";
import { getGroupRides, completeRide } from "../../services/rideService";

export default function RideHistory() {
  const [rides, setRides] = useState([]);
  const [groupId, setGroupId] = useState("");

  const load = async () => {
    const res = await getGroupRides(groupId);
    setRides(res.data);
  };

  return (
    <div className="p-6">
      <h2>Ride History</h2>

      <input
        placeholder="Enter Group ID"
        className="border p-2 mb-3"
        onChange={(e)=>setGroupId(e.target.value)}
      />

      <button onClick={load} className="bg-blue-600 text-white px-3 py-1">
        Load
      </button>

      {rides.map(r => (
        <div key={r.rideId} className="border p-3 mt-2">
          <p>Status: {r.status}</p>

          {r.status === "Started" && (
            <button
              onClick={()=>completeRide(r.rideId)}
              className="bg-red-500 text-white px-2 py-1"
            >
              Complete
            </button>
          )}
        </div>
      ))}
    </div>
  );
}