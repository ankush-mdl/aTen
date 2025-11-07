// src/pages/admin/ProjectForm.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import "../../assets/pages/admin/ProjectForm.css";
import { getImageUrl } from "../../lib/api";

const emptyConfig = () => ({ type: "3 BHK", size_min: "", size_max: "", price_min: "", price_max: "" });

function safeParseJson(v, fallback = []) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined || v === "") return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

// Backend base: use localhost backend in dev, else same-origin
const BACKEND_BASE = (typeof window !== "undefined" && window.location && window.location.hostname === "localhost") ? "http://localhost:5000" : "";

export default function ProjectForm() {
  const { id } = useParams(); // "new" or numeric/id or slug
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    location_area: "",
    city: "",
    address: "",
    rera: "",
    status: "Active",
    property_type: "Residential",
    configurations: [emptyConfig()],
    highlights: [],
    amenities: [],
    gallery: [],
    thumbnail: "",            // URL of selected thumbnail (new)
    brochure_url: "",
    contact_phone: "",
    contact_email: "",
    price_info: null,
    // metadata fields requested (kept only blocks/units/floors now)
    blocks: "",
    units: "",
    floors: "",
  });

  const [amenityText, setAmenityText] = useState("");
  const [highlightText, setHighlightText] = useState("");

  // --- new state: select existing uploads modal ---
  const [showUploadsModal, setShowUploadsModal] = useState(false);
  const [uploadsList, setUploadsList] = useState([]); // array of url strings (relative or absolute)
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [selectedUploads, setSelectedUploads] = useState(new Set());

  // ---- load existing project if editing ----
  useEffect(() => {
    if (!id || id === "new") return;
    (async () => {
      setLoading(true);
      try {
        // Primary attempt: GET /api/projects/:id  (some servers use slug here)
        let res = await fetch(`${BACKEND_BASE}/api/projects/${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          const p = data.project || data;
          if (p) fillFormFromProject(p);
          setLoading(false);
          return;
        }

        // Fallback: list and find by numeric id or slug
        const listRes = await fetch(`${BACKEND_BASE}/api/projects`);
        if (!listRes.ok) {
          toast.error("Failed to load project list");
          setLoading(false);
          return;
        }
        const listJson = await listRes.json();
        const items = listJson.items || [];
        // find by id or slug
        const byId = items.find(it => String(it.id) === String(id));
        const bySlug = items.find(it => String(it.slug) === String(id));
        const found = byId || bySlug;
        if (found) fillFormFromProject(found);
        else toast.error("Project not found");
      } catch (err) {
        console.error("Load project error", err);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function fillFormFromProject(p) {
    // convert JSON-string fields to arrays if necessary
    const gallery = safeParseJson(p.gallery, []);
    const highlights = safeParseJson(p.highlights, []);
    const amenities = safeParseJson(p.amenities, []);
    const configs = safeParseJson(p.configurations, p.configurations && p.configurations.length ? p.configurations : [emptyConfig()]);
    const price_info = (p.price_info && typeof p.price_info === "string") ? (() => { try { return JSON.parse(p.price_info); } catch { return p.price_info; } })() : p.price_info || null;

    setForm(prev => ({
      ...prev,
      title: p.title || "",
      slug: p.slug || "",
      location_area: p.location_area || "",
      city: p.city || "",
      address: p.address || "",
      rera: p.rera || "",
      status: p.status || "Active",
      property_type: p.property_type || "Residential",
      configurations: Array.isArray(configs) ? configs : [emptyConfig()],
      highlights: Array.isArray(highlights) ? highlights : [],
      amenities: Array.isArray(amenities) ? amenities : [],
      gallery: Array.isArray(gallery) ? gallery : [],
      thumbnail: p.thumbnail || (Array.isArray(gallery) && gallery.length ? gallery[0] : ""), // preserve thumbnail if exists else pick first image
      brochure_url: p.brochure_url || "",
      contact_phone: p.contact_phone || "",
      contact_email: p.contact_email || "",
      price_info,
      blocks: p.blocks || "",
      units: p.units || "",
      floors: p.floors || "",
    }));
  }

  // ---- helpers to update state ----
  const setField = (field, value) => setForm(s => ({ ...s, [field]: value }));
  const setConfigAt = (idx, obj) => setForm(s => ({ ...s, configurations: s.configurations.map((c, i) => (i === idx ? { ...c, ...obj } : c)) }));

  const addConfiguration = () => setForm(s => ({ ...s, configurations: [...s.configurations, emptyConfig()] }));
  const removeConfiguration = (idx) => setForm(s => ({ ...s, configurations: s.configurations.filter((_, i) => i !== idx) }));

  const addAmenity = () => {
    const txt = amenityText.trim();
    if (!txt) { toast.error("Amenity is empty"); return; }
    setForm(s => ({ ...s, amenities: [...s.amenities, txt] }));
    setAmenityText("");
    toast.success("Amenity added");
  };
  const removeAmenity = (i) => setForm(s => ({ ...s, amenities: s.amenities.filter((_, idx) => idx !== i) }));

  const addHighlight = () => {
    const txt = highlightText.trim();
    if (!txt) { toast.error("Highlight is empty"); return; }
    setForm(s => ({ ...s, highlights: [...s.highlights, txt] }));
    setHighlightText("");
    toast.success("Highlight added");
  };
  const removeHighlight = (i) => setForm(s => ({ ...s, highlights: s.highlights.filter((_, idx) => idx !== i) }));

  // ---- image upload ----
  async function uploadFiles(files) {
    if (!files || files.length === 0) return [];
    setUploading(true);
    const uploadedUrls = [];
    const toastId = toast.loading("Uploading images...");
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${BACKEND_BASE}/api/uploads`, { method: "POST", body: formData });
        if (!res.ok) {
          const txt = await res.text().catch(() => String(res.status));
          console.error("Upload failed", res.status, txt);
          toast.error(`Upload failed: ${res.status}`, { id: toastId });
          continue;
        }
        const j = await res.json();
        // server should reply { url: "/uploads/xxx.jpg" } or similar
        if (j.url) uploadedUrls.push(j.url);
        else if (j.path) uploadedUrls.push(j.path);
        else if (j.filename) uploadedUrls.push(`/uploads/${j.filename}`);
        else if (typeof j === "string") uploadedUrls.push(j);
      }

     if (uploadedUrls.length) {
  setForm(s => {
    const newGallery = [...s.gallery, ...uploadedUrls];
    // if no thumbnail selected yet, pick the first newly uploaded or existing first
    const thumbnail = s.thumbnail || newGallery[0] || "";
    return { ...s, gallery: newGallery, thumbnail };
  });
  toast.success(`Uploaded ${uploadedUrls.length} image(s)`, { id: toastId });
} else {
  toast.dismiss(toastId);
}
      return uploadedUrls;
    } catch (err) {
      console.error("Upload error", err);
      toast.error("Image upload failed");
      toast.dismiss(toastId);
      return [];
    } finally {
      setUploading(false);
    }
  }

  const onFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFiles(files);
    e.target.value = null;
  };

  const removeGalleryItem = (i) => {
    setForm(s => {
      const newGallery = s.gallery.filter((_, idx) => idx !== i);
      const newThumbnail = s.thumbnail === s.gallery[i] ? (newGallery[0] || "") : s.thumbnail;
      return { ...s, gallery: newGallery, thumbnail: newThumbnail };
    });
    toast.success("Image removed");
  };

  // set thumbnail by URL (image clicked or radio)
  const setThumbnail = (url) => {
    setForm(s => ({ ...s, thumbnail: url }));
    toast.success("Thumbnail selected");
  };

  // ---- new: fetch existing uploads from backend ----
  async function fetchUploadsList() {
    setUploadsLoading(true);
    setUploadsList([]);
    setSelectedUploads(new Set());
    try {
      const res = await fetch(`${BACKEND_BASE}/api/uploads`); // assume this endpoint exists
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        // try another common endpoint fallback
        console.warn("Primary /api/uploads failed:", res.status, txt);
        // attempt alternative endpoint
        const alt = await fetch(`${BACKEND_BASE}/uploads`); // maybe returns file listing as html (won't help) but try
        if (!alt.ok) throw new Error(`Uploads listing failed ${res.status}`);
      } else {
        const body = await res.json().catch(()=>null);
        let arr = [];
        if (Array.isArray(body)) arr = body;
        else if (body && Array.isArray(body.files)) arr = body.files;
        else if (body && Array.isArray(body.items)) arr = body.items;
        else if (body && typeof body === "object") {
          // maybe object of { filename: path } pairs
          arr = Object.values(body).filter(v => typeof v === "string");
        }
        // normalize strings: prefix backend base if needed (getImageUrl does this)
        setUploadsList(arr);
      }
    } catch (err) {
      console.error("Failed to fetch uploads list:", err);
      toast.error("Failed to load uploads list. Check backend endpoint /api/uploads");
    } finally {
      setUploadsLoading(false);
    }
  }

  // toggle selection in modal
  const toggleUploadSelect = (url) => {
    setSelectedUploads(prev => {
      const s = new Set(prev);
      if (s.has(url)) s.delete(url);
      else s.add(url);
      return s;
    });
  };

  const addSelectedUploadsToGallery = () => {
    const picked = Array.from(selectedUploads);
    if (picked.length === 0) { toast.error("No images selected"); return; }
    setForm(s => {
      const newGallery = [...s.gallery, ...picked];
      const thumbnail = s.thumbnail || newGallery[0] || "";
      return { ...s, gallery: newGallery, thumbnail };
    });
    toast.success(`Added ${picked.length} image(s) to gallery`);
    setShowUploadsModal(false);
  };

  // ---- submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.city) {
      toast.error("Please fill Title and City (required).");
      return;
    }
    setLoading(true);
    const tid = toast.loading("Saving project...");
    try {
      // make payload - ensure arrays are arrays (backend expects JSON strings, your server does JSON.stringify on server side)
      const payload = {
        ...form,
      };

      const method = id && id !== "new" ? "PUT" : "POST";
      const url = id && id !== "new" ? `${BACKEND_BASE}/api/projects/${id}` : `${BACKEND_BASE}/api/projects`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await res.json().catch(() => ({}));
        toast.success("Project saved", { id: tid });
        navigate("/admin/projects");
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Save error", err);
        const message = err.error || `Server responded ${res.status}`;
        toast.error("Save failed: " + message, { id: tid });
      }
    } catch (err) {
      console.error("Save error", err);
      toast.error("Save failed: exception");
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="project-form-shell">
      <form className="project-form" onSubmit={handleSubmit}>
        <h2>{id && id !== "new" ? "Edit Project" : "Add Project"}</h2>

        <div className="instructions">
          <h3>How to fill this form (quick guide)</h3>
          <ul>
            <li><strong>Title</strong>: Name of the project (e.g. "DTC Skyler").</li>
            <li><strong>Slug</strong>: URL friendly id (auto generated from Title if left empty).</li>
            <li><strong>City / Location area</strong>: City and neighbourhood for search and listing cards.</li>
            <li><strong>Address</strong>: Short address or landmark for displays.</li>
            <li><strong>RERA</strong>: RERA number (if applicable).</li>
            <li><strong>Configurations</strong>: Add unit types with sizes and price ranges.</li>
            <li><strong>Amenities</strong>: Add features (Gym, Pool) one at a time.</li>
            <li><strong>Highlights</strong>: Short selling bullets.</li>
            <li><strong>Gallery</strong>: Upload images (jpg/png). After upload you can choose a thumbnail image for listing cards.</li>
            <li><strong>Metadata</strong>: Blocks, Units, Floors (used on detail page).</li>
            <li><strong>Thumbnail</strong>: The selected thumbnail is sent in the payload as <code>thumbnail</code>.</li>
          </ul>
        </div>

        <section className="grid-2">
          <label>
            Title *
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Project title" required />
          </label>

          <label>
            Slug (optional)
            <input value={form.slug} onChange={(e) => setField("slug", e.target.value)} placeholder="auto-generated-from-title" />
          </label>

          <label>
            City *
            <input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="e.g. Kolkata" required />
          </label>

          <label>
            Location area
            <input value={form.location_area} onChange={(e) => setField("location_area", e.target.value)} placeholder="Joka / Salt Lake" />
          </label>

          <label className="full">
            Address
            <textarea value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Full/short address" />
          </label>

          <label>
            RERA / Reg. No.
            <input value={form.rera} onChange={(e) => setField("rera", e.target.value)} placeholder="WBRERA/..." />
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option>Active</option>
              <option>Under Construction</option>
              <option>Ready To Move</option>
              <option>Completed</option>
            </select>
          </label>

          <label>
            Property type
            <select value={form.property_type} onChange={(e) => setField("property_type", e.target.value)}>
              <option>Residential</option>
              <option>Commercial</option>
            </select>
          </label>
        </section>

        {/* Configurations */}
        <div className="panel">
          <div className="panel-header">
            <h4>Configurations</h4>
            <small>Define unit types (e.g., 2 BHK / 3 BHK) with sizes and price ranges.</small>
          </div>

          <div className="configs">
            {form.configurations.map((c, idx) => (
              <div className="config-row" key={idx}>
                <input className="cfg-type" value={c.type} onChange={(e) => setConfigAt(idx, { type: e.target.value })} />
                <input className="cfg-small" placeholder="size min (sqft)" value={c.size_min} onChange={(e) => setConfigAt(idx, { size_min: e.target.value })} />
                <input className="cfg-small" placeholder="size max (sqft)" value={c.size_max} onChange={(e) => setConfigAt(idx, { size_max: e.target.value })} />
                <input className="cfg-small" placeholder="price min" value={c.price_min} onChange={(e) => setConfigAt(idx, { price_min: e.target.value })} />
                <input className="cfg-small" placeholder="price max" value={c.price_max} onChange={(e) => setConfigAt(idx, { price_max: e.target.value })} />
                <button type="button" className="btn small" onClick={() => removeConfiguration(idx)}>Remove</button>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={addConfiguration} className="btn">+ Add configuration</button>
            </div>
          </div>
        </div>

        {/* Amenities & highlights */}
        <div className="grid-2">
          <div className="panel">
            <div className="panel-header"><h4>Amenities</h4></div>
            <div className="chip-row">
              <input value={amenityText} onChange={(e) => setAmenityText(e.target.value)} placeholder="e.g. Gymnasium" />
              <button type="button" className="btn" onClick={addAmenity}>Add Amenity</button>
            </div>
            <div className="chips">
              {form.amenities.map((a, i) => (
                <span className="chip" key={i}>
                  {a} <button type="button" onClick={() => removeAmenity(i)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h4>Highlights</h4></div>
            <div className="chip-row">
              <input value={highlightText} onChange={(e) => setHighlightText(e.target.value)} placeholder="e.g. Near Metro" />
              <button type="button" className="btn" onClick={addHighlight}>Add Highlight</button>
            </div>
            <div className="chips">
              {form.highlights.map((h, i) => (
                <span className="chip" key={i}>
                  {h} <button type="button" onClick={() => removeHighlight(i)}>×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery + Thumbnail picker */}
        <div className="panel">
          <div className="panel-header">
            <h4>Gallery</h4>
            <small>Upload images (jpg/png). Select one image as listing thumbnail.</small>
          </div>

          <div className="uploader-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFileChange} style={{ display: "none" }} />
            <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>{uploading ? "Uploading..." : "Select & Upload"}</button>

            {/* New button: select existing uploads */}
            <button
              type="button"
              className="btn"
              onClick={async () => {
                setShowUploadsModal(true);
                // fetch list when opened
                await fetchUploadsList();
              }}
            >
              Select from uploads
            </button>
          </div>

          <div className="gallery-preview" style={{ marginTop: 12 }}>
            {form.gallery.map((g, i) => (
              <div key={i} className="gallery-item">
                <div className="gallery-thumb-wrap">
                  <img src={ getImageUrl(g) } alt={`gallery-${i}`} />
                  <div className="gallery-controls">
                    <label className="thumb-radio">
                      <input
                        type="radio"
                        name="thumbnail"
                        checked={form.thumbnail === g}
                        onChange={() => setThumbnail(g)}
                      />
                      <span>Thumbnail</span>
                    </label>
                    <button type="button" className="remove" onClick={() => removeGalleryItem(i)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
            {form.gallery.length === 0 && <div className="placeholder">No images yet.</div>}
          </div>
        </div>

        {/* metadata fields + contact/brochure */}
        <section className="grid-2">
          <label>
            Blocks
            <input value={form.blocks} onChange={(e) => setField("blocks", e.target.value)} placeholder="e.g. A, B, C or 2" />
          </label>

          <label>
            Units
            <input value={form.units} onChange={(e) => setField("units", e.target.value)} placeholder="Total units (number)" />
          </label>

          <label>
            Floors
            <input value={form.floors} onChange={(e) => setField("floors", e.target.value)} placeholder="Number of floors" />
          </label>

          <label>
            Brochure URL
            <input value={form.brochure_url} onChange={(e) => setField("brochure_url", e.target.value)} placeholder="https://..." />
          </label>

          <label>
            Price info (JSON optional)
            <input value={form.price_info ? JSON.stringify(form.price_info) : ""} onChange={(e) => {
              try { setField("price_info", e.target.value ? JSON.parse(e.target.value) : null); } catch { }
            }} placeholder='e.g. [{"type":"3 BHK","price_min":"1.2 Cr","price_max":"1.6 Cr"}]' />
          </label>

          <label>
            Contact phone
            <input value={form.contact_phone} onChange={(e) => setField("contact_phone", e.target.value)} placeholder="+91..." />
          </label>

          <label>
            Contact email
            <input type="email" value={form.contact_email} onChange={(e) => setField("contact_email", e.target.value)} placeholder="sales@example.com" />
          </label>
        </section>

        <div className="form-actions" style={{ marginTop: 18 }}>
          <button type="submit" className="btn primary" disabled={loading}>{loading ? "Saving..." : "Save Project"}</button>
          <button type="button" className="btn" onClick={() => navigate("/admin/projects")} disabled={loading}>Cancel</button>
        </div>
      </form>

      {/* -------- Uploads modal (select existing) -------- */}
     {showUploadsModal && (
  <div className="modal-backdrop" onClick={() => setShowUploadsModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Select images from uploads</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => { setSelectedUploads(new Set()); }}>Clear</button>
          <button className="btn" onClick={() => setShowUploadsModal(false)}>Close</button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {uploadsLoading ? (
          <div>Loading images…</div>
        ) : uploadsList.length === 0 ? (
          <div style={{ color: "#666" }}>No uploads found on server (endpoint /api/uploads).</div>
        ) : null}
      </div>

      <div className="uploads-grid">
        {uploadsList.map((u, idx) => {
          const url = getImageUrl(u) || u;

          const normalizePath = (p) => {
            if (!p) return "";
            let s = String(p).trim();
            // remove backend base for consistent comparison
            if (typeof BACKEND_BASE === "string" && BACKEND_BASE && s.startsWith(BACKEND_BASE)) {
              s = s.replace(BACKEND_BASE, "");
            }
            if (!s.startsWith("/")) s = "/" + s;
            return s;
          };

          const inGallery = form.gallery.some(g => normalizePath(g) === normalizePath(u));
          const isThumbnail = normalizePath(form.thumbnail) === normalizePath(u);
          const isSelected = selectedUploads.has(u);
          const disabled = inGallery;

          return (
            <div
              key={idx}
              className={`image-card ${disabled ? "disabled" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => { if (!disabled) toggleUploadSelect(u); }}
              title={disabled ? "Already added to gallery" : (isSelected ? "Click to unselect" : "Click to select")}
            >
              <div className="media">
                <img src={url} alt={`upload-${idx}`} />
              </div>

              <div className="meta">
                <label className="select-label">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => { if (!disabled) toggleUploadSelect(u); }}
                    disabled={disabled}
                  />
                  <span>{disabled ? "In gallery" : "Select"}</span>
                </label>

                {isThumbnail && <span className="thumb-badge">✓ Thumbnail</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={() => setShowUploadsModal(false)}>Cancel</button>
        <button
          className="btn primary"
          onClick={() => {
            // deduplicate and add
            const picked = Array.from(selectedUploads || []);
            if (picked.length === 0) { toast.error("No images selected"); return; }
            setForm(s => {
              // normalize by keeping original string paths, but dedupe
              const combined = [...(s.gallery || []), ...picked];
              const unique = Array.from(new Set(combined));
              const thumbnail = s.thumbnail || unique[0] || "";
              return { ...s, gallery: unique, thumbnail };
            });
            // clear selection and close
            setSelectedUploads(new Set());
            setShowUploadsModal(false);
            toast.success(`Added ${picked.length} image(s) to gallery`);
          }}
          disabled={(selectedUploads && selectedUploads.size === 0)}
        >
          Add selected ({selectedUploads ? selectedUploads.size : 0})
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

// minimal inline styles for modal (you can move to CSS file)
const backdropStyle = {
  position: "fixed", inset: 0, background: "rgba(10,10,10,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
};
const modalStyle = {
  width: "min(1100px, 96%)", maxHeight: "88vh", overflow: "hidden", background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
};
