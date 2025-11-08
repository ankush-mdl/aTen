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

/**
 * Show a non-blocking confirmation using react-hot-toast.
 * onConfirm is called if the user presses the Delete button.
 * The toast is dismissed either way.
 */
function showDeleteConfirm({ title = "Delete project?", message = "This action cannot be undone.", onConfirm }) {
  const id = toast.custom((t) => (
    <div
      style={{
        background: "#F2E8E4",
        color: "#0f1720",
        padding: 14,
        borderRadius: 10,
        boxShadow: "0 8px 28px rgba(12,18,20,0.12)",
        border: "1px solid rgba(12,18,20,0.04)",
        width: 320,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
          <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>{message}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(12,18,20,0.06)",
            background: "transparent",
            color: "#333",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          onClick={() => {
            toast.dismiss(t.id);
            try { onConfirm && onConfirm(); } catch (err) { console.error(err); }
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#dc2626",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  ), { duration: 5000 });

  return id;
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

  const performDelete = async (id) => {
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

  const remove = (id, title) => {
    // show nice confirm toast
    showDeleteConfirm({
      title: `Delete "${title}"?`,
      message: "This will permanently delete the project.",
      onConfirm: () => performDelete(id),
    });
  };

  return (
    <div className="admin-projects">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2>Projects</h2>
        <div className="buttons">
          <Link to="/admin/projects/new" className="btn">Add Project</Link>
          <Link to="/admin/import" className="btn">Bulk Import</Link>
        </div>
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
                  <button className="delete" onClick={()=>remove(r.id, r.title)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
