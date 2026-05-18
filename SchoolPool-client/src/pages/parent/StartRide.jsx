import { useState, useEffect } from "react";
import { startRide } from "../../services/rideService";
import { getMyGroups } from "../../services/groupService";

export default function StartRide() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({
    groupId: "",
    vehicleId: ""
  });
  const [loading, setLoading] = useState(false);

  // Load user's groups for dropdown
  useEffect(() => {
    getMyGroups()
      .then(res => setGroups(res.data))
      .catch(() => alert("Failed to load groups"));
  }, []);

  const handleStart = async () => {
    if (!form.groupId) {
      alert("Please select a group ❌");
      return;
    }

    try {
      setLoading(true);
      const res = await startRide({
        groupId: parseInt(form.groupId),
        vehicleId: form.vehicleId ? parseInt(form.vehicleId) : null
      });
      localStorage.setItem("rideId", res.data.rideId);
      alert("Ride Started ✅");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start ride ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Start Ride</h2>

      {/* ✅ Dropdown with key props instead of manual Group ID input */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Select Group</label>
        <select
          className="border p-2 rounded w-full"
          value={form.groupId}
          onChange={(e) => setForm({ ...form, groupId: e.target.value })}
        >
          <option key="default" value="">-- Select a Group --</option>
          {groups.map((g) => (
            <option key={g.groupId} value={g.groupId}>
              {g.school?.schoolName ?? "No School"} — {g.locality}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          Vehicle ID (optional)
        </label>
        <input
          placeholder="Enter Vehicle ID"
          className="border p-2 rounded w-full"
          value={form.vehicleId}
          onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
        />
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Ride"}
      </button>
    </div>
  );
}