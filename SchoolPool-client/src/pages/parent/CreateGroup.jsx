import { useEffect, useState } from "react";
import { createGroup } from "../../services/groupService";
import { getSchools } from "../../services/schoolService";

export default function CreateGroup() {
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    schoolId: "",
    locality: "",
    maxMembers: 5
  });

  useEffect(() => {
    getSchools().then(res => setSchools(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createGroup(form);
    alert("Group Created");
  };

  return (
    <div className="p-6">
      <h2>Create Group</h2>

      <form onSubmit={handleSubmit} className="space-y-3">

        <select
          className="border p-2 w-full"
          onChange={(e)=>setForm({...form, schoolId:e.target.value})}
        >
          <option>Select School</option>
          {schools.map(s => (
            <option key={s.schoolId} value={s.schoolId}>
              {s.schoolName}
            </option>
          ))}
        </select>

        <input
          placeholder="Locality"
          className="border p-2 w-full"
          onChange={(e)=>setForm({...form, locality:e.target.value})}
        />

        <input
          type="number"
          placeholder="Max Members"
          className="border p-2 w-full"
          onChange={(e)=>setForm({...form, maxMembers:e.target.value})}
        />

        <button className="bg-blue-600 text-white px-4 py-2">
          Create
        </button>

      </form>
    </div>
  );
}