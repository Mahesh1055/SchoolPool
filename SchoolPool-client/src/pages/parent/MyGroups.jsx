import { useEffect, useState } from "react";
import { getMyGroups } from "../../services/groupService";

export default function MyGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMyGroups = async () => {
      try {
        setLoading(true);
        const res = await getMyGroups();
        setGroups(res.data);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load your groups ❌");
      } finally {
        setLoading(false);
      }
    };

    fetchMyGroups();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">My Groups</h2>

      {loading && <p>Loading...</p>}

      {!loading && groups.length === 0 && (
        <p className="text-gray-500">You have not joined any groups yet.</p>
      )}

      {groups.map((g, i) => (
        <div key={i} className="border p-4 mb-3 rounded shadow-sm">
          <h3 className="font-semibold text-lg">
            {g.school?.schoolName ?? "No School"}
          </h3>
          <p className="text-gray-600">Locality: {g.locality}</p>
          <p className="text-gray-600">Max Members: {g.maxMembers}</p>
          <p className="text-gray-600">Status: {g.status}</p>
          <p className="text-gray-600">Your Role: {g.role}</p>
          <p className="text-gray-600">
            Joined: {new Date(g.joinedAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}