// src/pages/ProjectsList.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import "../assets/pages/Project.css"; // your existing styles
import { getImageUrl } from "../lib/api";
// use absolute API base in development so dev server proxy won't break things
const API_BASE = process.env.NODE_ENV === "development" ? "http://localhost:5000" : "";

function safeParse(jsonOrString, fallback = []) {
  if (!jsonOrString && jsonOrString !== "") return fallback;
  if (Array.isArray(jsonOrString)) return jsonOrString;
  try {
    return JSON.parse(jsonOrString);
  } catch {
    return fallback;
  }
}

export default function ProjectsList() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [loading, setLoading] = useState(false);

  // derived filter options (populated after fetch)
  const [propertyTypeOptions, setPropertyTypeOptions] = useState([]);
  const [locationAreaOptions, setLocationAreaOptions] = useState([]);
  const [configurationOptions, setConfigurationOptions] = useState([]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (city) params.set("city", city);
      if (propertyType) params.set("property_type", propertyType);
      if (locationArea) params.set("location_area", locationArea);
      // configuration will be applied client-side because configurations are JSON arrays
      const url = `${API_BASE}/api/projects?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server ${res.status} ${txt}`);
      }
      const data = await res.json();
      const raw = data.items || [];

      // parse JSON columns safely (gallery, configurations, price_info)
      const parsed = raw.map((p) => ({
        ...p,
        gallery: safeParse(p.gallery, []),
        configurations: safeParse(p.configurations, []),
        price_info: (() => {
          try {
            return p.price_info ? JSON.parse(p.price_info) : null;
          } catch {
            return p.price_info || null;
          }
        })(),
      }));

      // client-side filtering for configuration (since it's a JSON array)
      let filtered = parsed;
      if (configuration) {
        const confLower = configuration.toLowerCase();
        filtered = parsed.filter((p) =>
          (p.configurations || []).some((c) => {
            const t = (c && (c.type || c.name || "")).toString().toLowerCase();
            return t.includes(confLower) || t === confLower;
          })
        );
      }

      setItems(filtered);

      // derive options for selects from raw data (unique values)
      const types = new Set();
      const areas = new Set();
      const confs = new Set();
      parsed.forEach((p) => {
        if (p.property_type) types.add(p.property_type);
        if (p.location_area) areas.add(p.location_area);
        (p.configurations || []).forEach((c) => {
          if (c && (c.type || c.name)) confs.add((c.type || c.name).toString());
        });
      });
      setPropertyTypeOptions(Array.from(types).sort());
      setLocationAreaOptions(Array.from(areas).sort());
      setConfigurationOptions(Array.from(confs).sort());
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      toast.error("Failed to load projects. Check server");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: trigger search (kept as explicit action)
  const onSearchClick = () => {
    fetchList();
  };

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h1>Browse Properties</h1>
        <div className="projects-filters" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input
            placeholder="Search projects..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />

          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="">All types</option>
            {propertyTypeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select value={locationArea} onChange={(e) => setLocationArea(e.target.value)}>
            <option value="">All areas</option>
            {locationAreaOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select value={configuration} onChange={(e) => setConfiguration(e.target.value)}>
            <option value="">Any configuration</option>
            {configurationOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button onClick={onSearchClick}>Search</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24 }}>Loading projects…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 28, color: "#666" }}>
          No projects found.
          <div style={{ marginTop: 12 }}>
            <button onClick={fetchList} className="btn">Reload</button>
          </div>
        </div>
      ) : (
        <div className="projects-grid">
          {items.map((p) => (
            <article key={p.id} className="project-card">
              <Link to={`/projects/${p.slug}`} className="card-link">
                <div className="card-media">
                  <img src={ getImageUrl((p.thumbnail) || (p.gallery && p.gallery[0]) || "/placeholder.jpg") } alt={p.title} />
                </div>
                <div className="card-body">
                  <h3>{p.title}</h3>
                  <div className="meta">{p.location_area} — {p.city}</div>
                  <div className="rera">{p.rera}</div>
                  <div className="card-cta">
                    <span className="type">{p.property_type}</span>
                  </div>
                </div>
              </Link>
              <div className="card-actions">
                <a href={`tel:${p.contact_phone}`} className="call">Call</a>
                <a href={`https://wa.me/${(p.contact_phone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="wa">WhatsApp</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
