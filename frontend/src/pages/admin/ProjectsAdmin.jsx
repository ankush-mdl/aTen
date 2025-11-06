// src/pages/admin/ProjectsAdmin.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import "../../assets/pages/admin/ProjectsAdmin.css";

const API_BASE = process.env.NODE_ENV === "development" ? "http://localhost:5000" : "";

function safeParse(arrOrStr) {
  if (!arrOrStr) return [];
  if (Array.isArray(arrOrStr)) return arrOrStr;
  try { return JSON.parse(arrOrStr); } catch { return []; }
}

export default function ProjectsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        throw new Error(`Server ${res.status} ${txt}`);
      }
      const data = await res.json();
      const list = (data.items || []).map(p => ({
        ...p,
        gallery: safeParse(p.gallery)
      }));
      setItems(list);
    } catch (err) {
      console.error("Failed to load projects:", err);
      toast.error("Failed to load projects. Check server.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete project?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        throw new Error(`Delete failed ${res.status} ${txt}`);
      }
      toast.success("Deleted");
      load();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Delete failed");
    }
  };

  return (
    <div className="admin-projects">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2>Projects</h2>
        <Link to="/admin/projects/new" className="btn">Add Project</Link>
      </div>

      {loading ? (
        <div style={{padding:20}}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{padding:20, color:"#666"}}>
          No projects found.
          <div style={{marginTop:12}}>
            <button onClick={load} className="btn">Reload</button>
          </div>
        </div>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Title</th><th>City</th><th>Slug</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(r=>(
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.city}</td>
                <td>{r.slug}</td>
                <td className="function">
                  <Link className="edit" to={`/admin/projects/${r.id}`}>Edit</Link>{" | "}
                  <button className="delete" onClick={()=>remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
