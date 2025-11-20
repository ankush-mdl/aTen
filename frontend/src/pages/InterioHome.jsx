import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../assets/pages/InterioHome.css";

const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "");

const logoSrc = "/atenlogo.png";

// flexible matcher: detect interio items in various fields
function isInterioItem(item = {}) {
  if (!item) return false;
  const check = (v) => {
    if (!v && v !== 0) return false;
    return String(v).toLowerCase().includes("interio") ||
           String(v).toLowerCase().includes("interior") ||
           String(v).toLowerCase().includes("interiors");
  };
  return (
    check(item.service_type) ||
    check(item.type) ||
    check(item.category) ||
    check(item.tags) ||
    check(item.slug) ||
    check(item.title) ||
    !!item.isInterio ||
    !!item.is_interio
  );
}

export default function InterioHome() {
  const navigate = useNavigate();

  // keep your protected navigation behavior
  const handleProtectedNavigation = (path) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        toast.error("Please login to continue!");
        navigate("/login");
        return;
      }
      navigate(path);
    } catch (e) {
      toast.error("Please login to continue!");
      navigate("/login");
    }
  };

  // Testimonials state
  const [testimonials, setTestimonials] = useState([]);
  const [tLoading, setTLoading] = useState(false);
  const [tError, setTError] = useState("");
  const testiRef = useRef(null);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState("");
  const projRef = useRef(null);

  // Load testimonials (Interio only)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setTLoading(true);
      setTError("");
      try {
        const res = await fetch(`${BACKEND_BASE}/api/testimonials?limit=1000`);
        if (!res.ok) throw new Error(`Server ${res.status}`);
        const payload = await res.json();
        const arr = Array.isArray(payload) ? payload : payload.items || payload || [];
        const interio = (arr || []).filter((it) => {
          if (!it) return false;
          if (it.isInterio || it.is_interio) return true;
          if (it.service_type && String(it.service_type).toLowerCase().includes("interio")) return true;
          return isInterioItem(it);
        });
        if (!mounted) return;
        setTestimonials(interio);
      } catch (err) {
        console.error("testimonials load:", err);
        if (mounted) setTError("Could not load testimonials");
      } finally {
        if (mounted) setTLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Load projects (Interio only)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setPLoading(true);
      setPError("");
      try {
        const res = await fetch(`${BACKEND_BASE}/api/projects`);
        if (!res.ok) throw new Error(`Server ${res.status}`);
        const payload = await res.json();
        const arr = Array.isArray(payload) ? payload : payload.items || payload || [];
        const normalized = (arr || []).map((p) => {
          try {
            const gallery = p.gallery ? (Array.isArray(p.gallery) ? p.gallery : JSON.parse(p.gallery)) : [];
            return { ...p, gallery };
          } catch {
            return { ...p, gallery: [] };
          }
        });
        const interio = normalized.filter((p) => isInterioItem(p));
        if (!mounted) return;
        setProjects(interio);
      } catch (err) {
        console.error("projects load:", err);
        if (mounted) setPError("Could not load projects");
      } finally {
        if (mounted) setPLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // scroll helpers
  const scrollBy = (ref, dir = 1) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.8) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="interio-page cards-layout">
      {/* TOP: two cards side-by-side (HOME | COMMERCIAL) */}
      <div className="cards-row">
        <div className="card-panel home-panel">
          <div className="card-body">
            <h3 className="card-title">HOME</h3>
            <p className="card-sub">Curated interior packages for 1/2/3 BHK, kitchens and bathrooms.</p>
            <div className="card-actions">
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/1bhk")}>1 BHK</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/2bhk")}>2 BHK</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/3bhk")}>3 BHK</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/3-plus")}>3+ BHK</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/kitchen")}>Kitchen</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/bathroom")}>Bathroom</button>
            </div>
          </div>
        </div>

        <div className="card-panel commercial-panel">
          <div className="card-body">
            <h3 className="card-title">COMMERCIAL</h3>
            <p className="card-sub">Solutions for offices, cafes, showrooms, clinics and more.</p>
            <div className="card-actions">
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/offices")}>Offices</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/cafes")}>Cafes</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/showrooms")}>Showrooms</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/banquets")}>Banquets</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/clinics")}>Restaurants</button>
              <button className="pill" onClick={() => handleProtectedNavigation("/catalog/other")}>Others</button>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials section */}
      <section className="panel testimonials-section">
        <div className="section-head">
          <h4>What our Interio clients say</h4>
          <div className="controls">
            <button onClick={() => scrollBy(testiRef, -1)} className="ctrl">‹</button>
            <button onClick={() => scrollBy(testiRef, 1)} className="ctrl">›</button>
          </div>
        </div>

        {tLoading ? (
          <div className="panel-empty">Loading testimonials…</div>
        ) : tError ? (
          <div className="panel-empty error">{tError}</div>
        ) : testimonials.length === 0 ? (
          <div className="panel-empty">No testimonials yet.</div>
        ) : (
          <div className="track-wrap">
            <div className="track testimonials-track" ref={testiRef} role="list">
              {testimonials.map((t) => {
                const img = t.customer_image || logoSrc;
                return (
                  <figure className="testimonial-card" key={t.id || t._id}>
                    <div className="testimonial-img">
                      <img src={img} alt={t.name || "Customer"} onError={(e) => (e.currentTarget.src = logoSrc)} loading="lazy" />
                    </div>
                    <blockquote>{t.review || t.text || t.message}</blockquote>
                    <figcaption>
                      <strong>{t.name || "Anonymous"}</strong>
                      <span className="muted"> — {t.service_type || t.role || "Customer"}</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Previous projects showcase */}
      <section className="panel projects-section">
        <div className="section-head">
          <h4>Previous Interio Projects</h4>
          <div className="controls">
            <button onClick={() => scrollBy(projRef, -1)} className="ctrl">‹</button>
            <button onClick={() => scrollBy(projRef, 1)} className="ctrl">›</button>
          </div>
        </div>

        {pLoading ? (
          <div className="panel-empty">Loading projects…</div>
        ) : pError ? (
          <div className="panel-empty error">{pError}</div>
        ) : projects.length === 0 ? (
          <div className="panel-empty">No projects found.</div>
        ) : (
          <div className="track-wrap">
            <div className="track projects-track" ref={projRef} role="list">
              {projects.map((p) => {
                const img = (p.gallery && p.gallery[0]) || p.cover_image || "/project-placeholder.jpg";
                return (
                  <article className="project-card" key={p.id || p._id}>
                    <div className="project-thumb" style={{ backgroundImage: `url(${img})` }} />
                    <div className="project-info">
                      <h5>{p.title || p.name || "Untitled Project"}</h5>
                      <div className="meta">{p.city || p.location || "—"} • {p.size || p.area || "—"}</div>
                      <div className="theme">{p.theme || p.design_theme || p.style || "—"}</div>
                      <div className="project-actions">
                        <Link to={`/projects/${p.id || p.slug || ""}`} className="btn small">View</Link>
                        <button className="btn small" onClick={() => handleProtectedNavigation(`/projects/${p.id || p.slug || ""}`)}>Enquire</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
