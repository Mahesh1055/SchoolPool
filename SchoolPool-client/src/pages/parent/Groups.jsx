import { useEffect, useState } from "react";
import { getGroups, joinGroup } from "../../services/groupService";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getGroups(search);
      setGroups(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load groups ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleJoin = async (groupId) => {
    try {
      setJoiningId(groupId);
      await joinGroup(groupId);
      alert("Joined successfully! ✅");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to join group ❌");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Find Groups</h2>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Search by locality"
          className="border p-2 rounded w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && groups.length === 0 && (
        <p className="text-gray-500">No groups found.</p>
      )}

      {groups.map((g) => (
        <div key={g.groupId} className="border p-4 mb-3 rounded shadow-sm">
          <h3 className="font-semibold text-lg">
            {g.school?.schoolName ?? "No School"}
          </h3>
          <p className="text-gray-600">Locality: {g.locality}</p>
          <p className="text-gray-600">
            Members: {g.memberCount} / {g.maxMembers}
          </p>
          <p className="text-gray-600">Status: {g.status}</p>

          <button
            onClick={() => handleJoin(g.groupId)}
            disabled={joiningId === g.groupId}
            className="mt-2 bg-green-600 text-white px-4 py-1 rounded disabled:opacity-50"
          >
            {joiningId === g.groupId ? "Joining..." : "Join"}
          </button>
        </div>
      ))}
    </div>
  );
}