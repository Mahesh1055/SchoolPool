import { useState } from "react";
import { markAttendance } from "../../services/rideService";

export default function Attendance() {
  const [childId, setChildId] = useState("");
  const rideId = localStorage.getItem("rideId");

  const update = async (status) => {
    await markAttendance({
      rideId,
      childId,
      status
    });
    alert("Updated");
  };

  return (
    <div className="p-6">
      <h2>Attendance</h2>

      <input
        placeholder="Child ID"
        className="border p-2 mb-4"
        onChange={(e)=>setChildId(e.target.value)}
      />

      <button onClick={()=>update("Boarded")} className="bg-blue-500 text-white px-3 py-1 mr-2">
        Boarded
      </button>

      <button onClick={()=>update("Dropped")} className="bg-purple-500 text-white px-3 py-1">
        Dropped
      </button>
    </div>
  );
}