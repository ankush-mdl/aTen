// src/pages/ProjectDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import "../assets/pages/ProjectDetail.css";
import { getImageUrl } from "../lib/api";
const API_BASE = process.env.NODE_ENV === "development" ? "http://localhost:5000" : "";

function safeParseJson(v, fallback = []) {
  if (!v && v !== "") return fallback;
  if (Array.isArray(v)) return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const loadBySlug = async () => {
      try {
        // Try direct GET by slug first
        const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          const p = data.project || data;
          normalizeAndSet(p);
          return;
        }

        // If 404 (route exists but not found) or other, try fallback: fetch list and match by id or slug
        if (res.status === 404 || res.status === 400 || res.status === 500) {
          // fallback: fetch list
          const listRes = await fetch(`${API_BASE}/api/projects`);
          if (!listRes.ok) {
            const txt = await listRes.text().catch(()=>"");
            throw new Error(`List fetch failed ${listRes.status} ${txt}`);
          }
          const listJson = await listRes.json();
          const items = listJson.items || [];
          // try to find by slug OR by numeric id if slug is numeric
          const bySlug = items.find(it => String(it.slug) === String(slug));
          if (bySlug) {
            normalizeAndSet(bySlug);
            return;
          }
          const maybeId = Number(slug);
          if (!Number.isNaN(maybeId)) {
            const byId = items.find(it => Number(it.id) === maybeId);
            if (byId) {
              normalizeAndSet(byId);
              return;
            }
          }
          // not found
          toast.error("Project not found");
          setProject(null);
        } else {
          // other response codes
          const txt = await res.text().catch(()=>"");
          throw new Error(`Fetch failed ${res.status} ${txt}`);
        }
      } catch (err) {
        console.error("Error loading project:", err);
        toast.error("Failed to load project");
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    const normalizeAndSet = (p) => {
      if (!p) {
        setProject(null);
        setLoading(false);
        return;
      }
      const normalized = {
        ...p,
        // parse JSON string fields if present
        gallery: safeParseJson(p.gallery, []),
        highlights: safeParseJson(p.highlights, []),
        amenities: safeParseJson(p.amenities, []),
        configurations: safeParseJson(p.configurations, []),
        price_info: (typeof p.price_info === "string") ? (() => {
          try { return JSON.parse(p.price_info); } catch { return p.price_info || null; }
        })() : p.price_info || null,
      };
      setProject(normalized);
      setLoading(false);
    };

    loadBySlug();
  }, [slug]);

  if (loading) return <div style={{ padding: 24 }}>Loading project…</div>;
  if (!project) return (
    <div style={{ padding: 24 }}>
      <div>Project not found.</div>
      <div style={{ marginTop: 12 }}><Link to="/projects">← Back to Projects</Link></div>
    </div>
  );

  return (
    <div className="project-detail">
      <div className="hero">
        <div className="hero-media">
          <img src={ getImageUrl((project.thumbnail) || "/placeholder.jpg") } alt={project.title} />

        </div>
        <div className="hero-meta">
          <h1>{project.title}</h1>
          <div className="loc">{project.location_area}{project.city ? `, ${project.city}` : ""}</div>
          {project.rera && <div className="rera">{project.rera}</div>}
          <div className="cta-row">
            {project.contact_phone && <a href={`tel:${project.contact_phone}`} className="btn">Call</a>}
            {project.contact_phone && (
              <a href={`https://wa.me/${(project.contact_phone||"").replace(/\D/g,"")}`} className="btn wa" target="_blank" rel="noreferrer">WhatsApp</a>
            )}
            {project.brochure_url && <a href={project.brochure_url} target="_blank" rel="noreferrer" className="btn">Brochure</a>}
          </div>
        </div>
      </div>

      <div className="content-grid">
      
         <section className="overview">
  <h2>Overview</h2>
  <p>{project.address}</p>
  <p>Status: {project.status}</p>
  <p>Blocks: {project.blocks} </p>
   <p>Floors: {project.floors}</p>
   <p>Units: {project.units}</p>

  <h4>Amenities</h4>
  <ul className="amenities">{(project.amenities||[]).map((a,i)=><li key={i}>{a}</li>)}</ul>
</section>

<aside className="sidebar">
  <h3>Highlights</h3>
  <ul>{(project.highlights||[]).map((h,i)=><li key={i}>{h}</li>)}</ul>

  <h3>Configurations</h3>
  <div>
    {(project.configurations||[]).map((c,i)=>(
      <div key={i} className="config">
        <strong>{c.type}</strong> — {c.size_min || ""}{c.size_min && c.size_max ? ` - ${c.size_max}` : ""} sqft
        {c.price_min || c.price_max ? <div>Price: {c.price_min || "-"} - {c.price_max || "-"}</div> : null}
      </div>
    ))}
  </div>
</aside>
      </div>

      {project.gallery && project.gallery.length > 0 && (
        <div className="gallery">
         {project.gallery && project.gallery.map((g,i) => <img key={i} src={ getImageUrl(g) } alt={`${project.title}-${i}`} />)}

        </div>
      )}

      <div style={{marginTop:24}}>
        <Link to="/projects">← Back to Projects</Link>
      </div>
    </div>
  );
}
