import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import "../assets/pages/ProjectDetail.css";
import { getImageUrl } from "../lib/api";

const BACKEND_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "";

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
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const loadBySlug = async () => {
      try {
        const res = await fetch(
          `${BACKEND_BASE}/api/projects/${encodeURIComponent(slug)}`
        );
        if (res.ok) {
          const data = await res.json();
          const p = data.project || data;
          normalizeAndSet(p);
          return;
        }

        if ([400, 404, 500].includes(res.status)) {
          const listRes = await fetch(`${BACKEND_BASE}/api/projects`);
          if (!listRes.ok) throw new Error("List fetch failed");
          const listJson = await listRes.json();
          const items = listJson.items || [];
          const bySlug = items.find((it) => String(it.slug) === String(slug));
          if (bySlug) return normalizeAndSet(bySlug);

          const maybeId = Number(slug);
          if (!Number.isNaN(maybeId)) {
            const byId = items.find((it) => Number(it.id) === maybeId);
            if (byId) return normalizeAndSet(byId);
          }
          toast.error("Project not found");
          setProject(null);
        } else {
          const txt = await res.text().catch(() => "");
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
        gallery: safeParseJson(p.gallery, []),
        highlights: safeParseJson(p.highlights, []),
        amenities: safeParseJson(p.amenities, []),
        configurations: safeParseJson(p.configurations, []),
        price_info:
          typeof p.price_info === "string"
            ? (() => {
                try {
                  return JSON.parse(p.price_info);
                } catch {
                  return p.price_info || null;
                }
              })()
            : p.price_info || null,
      };
      setProject(normalized);
      setLoading(false);
    };

    loadBySlug();
  }, [slug]);

  if (loading) return <div style={{ padding: 24 }}>Loading project…</div>;
  if (!project)
    return (
      <div style={{ padding: 24 }}>
        <div>Project not found.</div>
         <div className="back-btn-container">
        <Link to="/projects" className="back-btn">
          Back to Projects
        </Link>
      </div>

      </div>
    );

  const gallery = project.gallery || [];

  return (
    <div className="project-detail">
      {/* Hero Section */}
      <div className="hero">
        <div className="hero-media">
          <img
            src={getImageUrl(project.thumbnail || "/placeholder.jpg")}
            alt={project.title}
          />
        </div>
        <div className="hero-meta">
          <h1 className="project-title">{project.title}</h1>
          <div className="project-location">
            {project.location_area}
            {project.city ? `, ${project.city}` : ""}
          </div>
          {project.rera && (
            <div className="project-rera">RERA: {project.rera}</div>
          )}
          <div className="cta-row">
            {project.contact_phone && (
              <a href={`tel:${project.contact_phone}`} className="btn-call">
                Call
              </a>
            )}
            {project.contact_phone && (
              <a
                href={`https://wa.me/${(project.contact_phone || "").replace(
                  /\D/g,
                  ""
                )}`}
                className="btn-wa"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            )}
            {project.brochure_url && (
              <a
                href={project.brochure_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Download Brochure
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content grid: overview + sidebar */}
      <div className="content-grid">
        {/* Overview Section */}
        <section className="overview">
          <div className="overview-top">
            <h2>Project Overview</h2>
            <div className="overview-sub">
              <strong>{project.location_area}</strong>
              {project.city ? ` • ${project.city}` : ""}
            </div>
          </div>

          <div className="overview-grid">
            <div className="overview-item">
              <div className="overview-label">Residential Property Type</div>
              <div className="overview-value">
                {project.property_type || project.type || "—"}
              </div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Construction Status</div>
              <div className="overview-value">{project.status || "—"}</div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Land Area</div>
              <div className="overview-value">
                {project.land_area || project.area || "—"}
              </div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Handover</div>
              <div className="overview-value">
                {project.handover || project.possession || "—"}
              </div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Blocks & Units</div>
              <div className="overview-value">
                {project.blocks ||
                  (project.units ? `— | ${project.units} Units` : "—")}
              </div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Floors</div>
              <div className="overview-value">{project.floors || "—"}</div>
            </div>
            <div className="overview-item">
              <div className="overview-label">Site Address</div>
              <div className="overview-value">{project.address || "—"}</div>
            </div>
            <div className="overview-item">
              <div className="overview-label">RERA Number</div>
              <div className="overview-value">{project.rera || "—"}</div>
            </div>
          </div>

          <div className="overview-why">
            <h3>Why Choose {project.title}</h3>
            <p
              dangerouslySetInnerHTML={{
                __html:
                  project.description ||
                  project.long_description ||
                  project.about ||
                  "No description available.",
              }}
            />
          </div>
        </section>

        {/* Sidebar / Highlights */}
        <aside className="sidebar wide-sidebar">
          <div className="sidebar-inner">
            <h3>Highlights</h3>
            <ul>
              {(project.highlights || []).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>

            <h3>Configurations</h3>
            {(project.configurations || []).length > 0 ? (
              <div className="config-table-wrapper">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Size (sqft)</th>
                      <th>Price Range (in Lakh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project.configurations || []).map((c, i) => (
                      <tr key={i}>
                        <td>{c.type || "—"}</td>
                        <td>
                          {c.size_min && c.size_max
                            ? `${c.size_min} - ${c.size_max}`
                            : c.size_min || c.size_max || "—"}
                        </td>
                        <td>
                          {c.price_min && c.price_max
                            ? `${c.price_min} - ${c.price_max}`
                            : c.price_min || c.price_max || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-config">No configurations available.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Developer Details (Full Width Card) */}
{project.developer_name && (
  <section className="developer-card">
    <h2>Developer Details</h2>
    <div className="developer-card-inner">
      {project.developer_logo && (
        <div className="developer-card-logo">
          <img
            src={getImageUrl(project.developer_logo)}
            alt={project.developer_name}
          />
        </div>
      )}

      <div className="developer-card-info">
        <h3 className="developer-card-title">{project.developer_name}</h3>
        <p className="developer-card-desc">
          {project.developer_description || "Trusted real estate developer."}
        </p>
      </div>
    </div>
  </section>
)}


      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="gallery-section">
          <h2 className="section-title">Gallery</h2>
          <div className="gallery">
            {gallery.map((g, i) => (
              <img
                key={i}
                src={getImageUrl(g)}
                alt={`${project.title}-${i}`}
                onClick={() => setLightboxIndex(i)}
                className="gallery-img"
              />
            ))}
          </div>
        </section>
      )}

      <div className="back-btn-container">
        <Link to="/projects" className="back-btn">
          Back to Projects
        </Link>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="lightbox-close"
            onClick={() => setLightboxIndex(null)}
          >
            ✕
          </button>
          <img
            src={getImageUrl(gallery[lightboxIndex])}
            alt="Fullscreen"
            className="lightbox-image"
          />
          {gallery.length > 1 && (
            <>
              <button
                className="lightbox-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + gallery.length) % gallery.length
                  );
                }}
              >
                ‹
              </button>
              <button
                className="lightbox-next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % gallery.length);
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
