import { Link, useParams, useNavigate } from "react-router-dom";
import "./../assets/pages/Catalog.css";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

/* backend base (dev -> localhost backend, else same-origin) */
const BACKEND_BASE =
  typeof window !== "undefined" && window.location && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "";

/* options */
const catalogOptions = {
  themes: ["Modern Cozy", "Urban Luxe", "Classic Elegance", "Minimal Comfort"],
  kitchens: ["Modular", "Island", "Parallel", "Open Concept", "U-Shaped"],
  materials: ["Standard", "Premium"],
};

/* kitchen-specific themes (you can expand) */
const kitchenThemes = ["Island", "Parallel", "Open Concept", "U-Shaped"];

/* clearly defined commercial types (used for routing / detection) */
const commercialTypes = ["offices", "cafes", "showrooms", "banquets", "clinics", "salons", "other"];

export default function CatalogWithSummary() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState({
    apartmentType: "",
    email: "",
    name: "",
    city: "",
    washrooms: "",
    carpetArea: "",
    themes: [],
    kitchens: [],
    materials: [],
    // kb-specific
    bathroomType: "", // "Premium" | "Luxe"
    kitchenType: "", // "Modular" | "Semi Modular" (or more)
    kitchenTheme: "", // chosen kitchen theme
    // custom enquiry fields
    custom_type: "", // e.g., offices, cafes etc.
    custom_message: "",
  });

  // helper: robust detection for 3+bhk style strings
  const is3Plus = (t) => {
    if (!t) return false;
    // normalize: lower + collapse whitespace + replace common separators
    const normalized = String(t).toLowerCase().trim().replace(/\s+/g, "");
    // accept: any explicit plus forms (3+bhk, 3+), or '3plus', or '3-plus' (normalized) or '3plusbhk'
    return /(^3\+bhk$)|(^3\+$)|(^3plus$)|(^3plusbhk$)|(^3\-?plus$)|(^3\-?plusbhk$)/i.test(normalized) || normalized.includes("3+");
  };

  useEffect(() => {
    if (type) {
      const raw = String(type).trim();
      const tl = raw.toLowerCase();

      // Normalize display label for the readonly field
      if (is3Plus(raw) || tl === "3-plus" || tl === "3+bhk" || tl === "3plus") {
        setSelected((prev) => ({ ...prev, apartmentType: "3+ BHK" }));
      } else if (tl === "bathroom") {
        setSelected((prev) => ({ ...prev, apartmentType: "Bathroom" }));
      } else if (tl === "kitchen") {
        setSelected((prev) => ({ ...prev, apartmentType: "Kitchen" }));
      } else if (commercialTypes.includes(tl)) {
        // show the commercial type as apartmentType (but editable for custom)
        setSelected((prev) => ({ ...prev, apartmentType: raw }));
      } else {
        // assume "1bhk", "2bhk", "3bhk" etc.
        setSelected((prev) => ({ ...prev, apartmentType: raw.replace(/bhk/i, " BHK") }));
      }
    } else {
      // clear apartmentType when no type param
      setSelected((prev) => ({ ...prev, apartmentType: "" }));
    }
  }, [type]);

  /* Generic toggle for multi-select categories (themes, kitchens, materials) */
  const toggleSelection = (category, value) => {
    setSelected((prev) => {
      const items = Array.isArray(prev[category]) ? prev[category] : [];
      if (category === "materials") {
        // materials is single-select (only one expensive option at a time)
        return { ...prev, materials: items.includes(value) ? [] : [value] };
      }
      return items.includes(value)
        ? { ...prev, [category]: items.filter((v) => v !== value) }
        : { ...prev, [category]: [...items, value] };
    });
  };

  const handleInputChange = (field, value) => {
    setSelected((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemoveSelection = (category, value) => {
    setSelected((prev) => ({ ...prev, [category]: (prev[category] || []).filter((item) => item !== value) }));
  };

  /* ----- KB Enquiry submit (bathroom or kitchen) ----- */
  const submitKbEnquiry = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const user_id = user?.id;
    if (!user_id) {
      toast.error("Please login first before submitting an enquiry.");
      return;
    }

    // Build payload according to type
    const payloadBase = {
      user_id,
      type: type, // "bathroom" or "kitchen"
      email: selected.email || "",
      city: selected.city || "",
      area: parseInt(selected.carpetArea) || 0,
    };

    if (type && type.toLowerCase() === "bathroom") {
      if (!selected.bathroomType) {
        toast.error("Please select a bathroom option (Premium or Luxe).");
        return;
      }
      payloadBase.bathroom_type = selected.bathroomType;
    } else if (type && type.toLowerCase() === "kitchen") {
      if (!selected.kitchenType) {
        toast.error("Please select kitchen type (Modular or Semi Modular).");
        return;
      }
      payloadBase.kitchen_type = selected.kitchenType;
      payloadBase.kitchen_theme = selected.kitchenTheme || "";
    } else {
      toast.error("Invalid KB type.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_BASE || "http://localhost:5000"}/api/kb_enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBase),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("KB Enquiry submitted. We will reach out soon.");
        // reset some fields
        setSelected((prev) => ({
          ...prev,
          email: "",
          city: "",
          carpetArea: "",
          bathroomType: "",
          kitchenType: "",
          kitchenTheme: "",
        }));
      } else {
        console.error("Failed KB enquiry:", data);
        toast.error("Failed to submit KB enquiry. " + (data.error || ""));
      }
    } catch (err) {
      console.error("Error sending KB enquiry:", err);
      toast.error("Network error while submitting enquiry.");
    }
  };

  /* ----- Custom enquiry submit (3+bhk, commercial) ----- */
  const submitCustomEnquiry = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const user_id = user?.id;
    if (!user_id) {
      toast.error("Please login first before submitting an enquiry.");
      return;
    }

    // For custom flows include custom_message + allow editable type
    const payload = {
      user_id,
      email: selected.email || "",
      type: (is3Plus(type) ? selected.apartmentType : (type || selected.custom_type || "")).trim(),
      city: selected.city || "",
      area: parseInt(selected.carpetArea) || 0,
      custom_message: selected.custom_message || "",
    };

    try {
      const res = await fetch(`${BACKEND_BASE || "http://localhost:5000"}/api/custom_enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Custom enquiry submitted. We will contact you.");
        setSelected((prev) => ({
          ...prev,
          email: "",
          city: "",
          carpetArea: "",
          custom_message: "",
        }));
      } else {
        console.error("Failed custom enquiry:", data);
        toast.error("Failed to submit custom enquiry. " + (data.error || ""));
      }
    } catch (err) {
      console.error("Error sending custom enquiry:", err);
      toast.error("Network error while submitting enquiry.");
    }
  };

  /* ----- Default enquiry (general/catalog) ----- */
  const submitDefaultEnquiry = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    const user_id = user.id;
    const enquiryData = {
      user_id,
      email: selected.email,
      city: selected.city || "",
      type: selected.apartmentType,
      bathroom_number: parseInt(selected.washrooms) || 0,
      kitchen_type: (selected.kitchens || []).join(", "),
      material: (selected.materials || []).join(", "),
      area: parseInt(selected.carpetArea) || 0,
      theme: (selected.themes || []).join(", "),
    };

    try {
      const response = await fetch(`${BACKEND_BASE || "http://localhost:5000"}/api/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enquiryData),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success("Enquiry submitted successfully! Our agent will contact you soon.");
        // reset form (keep apartmentType)
        setSelected({
          apartmentType: selected.apartmentType,
          email: "",
          name: "",
          city: "",
          washrooms: "",
          carpetArea: "",
          themes: [],
          kitchens: [],
          materials: [],
          bathroomType: "",
          kitchenType: "",
          kitchenTheme: "",
          custom_type: "",
          custom_message: "",
        });
      } else {
        console.error("Failed to submit enquiry:", data);
        toast.error("Failed to submit enquiry. " + (data.error || ""));
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while submitting the enquiry.");
    }
  };

  /* ---------- Renderers ---------- */

  // Bathroom screen: only two options (Premium, Luxe) single-select
  const renderBathroom = () => (
    <div className="catalog-layout">
      <div className="catalog-left">
        <div className="selection-card">
          <h3>Bathroom Options</h3>
          <div className="option-list">
            {["Premium", "Luxe"].map((opt) => (
              <button
                key={opt}
                className={`option-btn ${selected.bathroomType === opt ? "selected" : ""}`}
                onClick={() => setSelected((prev) => ({ ...prev, bathroomType: prev.bathroomType === opt ? "" : opt }))}
              >
                {opt}
              </button>
            ))}
          </div>
          <p style={{ marginTop: 12, color: "#666" }}>Choose only one bathroom finish.</p>
        </div>
      </div>

      <div className="catalog-summary">
        <button className="back-btn" onClick={() => navigate("/interio")}> Back</button>
        <h2>Bathroom Enquiry</h2>

        <div className="summary-fields">
          <div className="summary-section">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" value={selected.email} onChange={(e) => handleInputChange("email", e.target.value)} />
          </div>
          <div className="summary-section">
            <label>City</label>
            <input type="text" placeholder="City" value={selected.city} onChange={(e) => handleInputChange("city", e.target.value)} />
          </div>
          <div className="summary-section">
            <label>Carpet Area (sq. ft)</label>
            <input type="number" placeholder="e.g. 1200" value={selected.carpetArea} onChange={(e) => handleInputChange("carpetArea", e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <h4>Selected Bathroom</h4>
          <div className="selection-tags">
            {selected.bathroomType ? (
              <span className="tag">{selected.bathroomType}</span>
            ) : (
              <p className="placeholder">No bathroom option selected.</p>
            )}
          </div>
        </div>

        <button className="quote-btn" onClick={submitKbEnquiry}>Submit Bathroom Enquiry</button>
      </div>
    </div>
  );

  // Kitchen screen: pick kitchen type (single) and kitchen theme (single). Themes are from kitchenThemes
  const renderKitchen = () => (
    <div className="catalog-layout">
      <div className="catalog-left">
        <div className="selection-card">
          <h3>Kitchen Type</h3>
          <div className="option-list">
            {["Modular", "Semi Modular"].map((opt) => (
              <button
                key={opt}
                className={`option-btn ${selected.kitchenType === opt ? "selected" : ""}`}
                onClick={() => setSelected((prev) => ({ ...prev, kitchenType: prev.kitchenType === opt ? "" : opt }))}
              >
                {opt}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: 18 }}>Kitchen Themes</h3>
          <div className="option-list">
            {kitchenThemes.map((th) => (
              <button
                key={th}
                className={`option-btn ${selected.kitchenTheme === th ? "selected" : ""}`}
                onClick={() => setSelected((prev) => ({ ...prev, kitchenTheme: prev.kitchenTheme === th ? "" : th }))}
              >
                {th}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="catalog-summary">
        <button className="back-btn" onClick={() => navigate("/interio")}> Back</button>
        <h2>Kitchen Enquiry</h2>

        <div className="summary-fields">
          <div className="summary-section">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" value={selected.email} onChange={(e) => handleInputChange("email", e.target.value)} />
          </div>
          <div className="summary-section">
            <label>City</label>
            <input type="text" placeholder="City" value={selected.city} onChange={(e) => handleInputChange("city", e.target.value)} />
          </div>
          <div className="summary-section">
            <label>Carpet Area (sq. ft)</label>
            <input type="number" placeholder="e.g. 1200" value={selected.carpetArea} onChange={(e) => handleInputChange("carpetArea", e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <h4>Selected</h4>
          <div className="selection-tags">
            {selected.kitchenType ? <span className="tag">{selected.kitchenType}</span> : <p className="placeholder">No kitchen type selected.</p>}
            {selected.kitchenTheme ? <span className="tag">{selected.kitchenTheme}</span> : <p className="placeholder">No kitchen theme selected.</p>}
          </div>
        </div>

        <button className="quote-btn" onClick={submitKbEnquiry}>Submit Kitchen Enquiry</button>
      </div>
    </div>
  );

  const renderCustom = () => {
    // determine whether this is a 3+ bhk or other commercial that requires editable first field
    const editableType = is3Plus(type) || commercialTypes.includes((type || "").toLowerCase());

    // placeholder text for the editable type input
    const placeholderText = is3Plus(type)
      ? "e.g. 4 BHK (enter exact BHK)"
      : "e.g. Offices / Cafes / Showroom — describe property";

    return (
      <div className="catalog-layout">
        <div className="catalog-left">
          <div className="selection-card">
            <h3>Custom Enquiry</h3>
            <div style={{ color: "#555", marginTop: 8 }}>
              For large or custom projects (3+ BHK and commercial), provide details below.
            </div>
            <div style={{ marginTop: 12 }}>
              <textarea
                placeholder="Project details (optional)"
                value={selected.custom_message}
                onChange={(e) => handleInputChange("custom_message", e.target.value)}
                style={{ width: "100%", minHeight: 120, padding: 10, borderRadius: 8 }}
              />
            </div>
          </div>
        </div>

        <div className="catalog-summary">
          <button className="back-btn" onClick={() => navigate("/interio")}>Back</button>
          <h2>Custom / Commercial Enquiry</h2>

          <div className="summary-fields">
            <div className="summary-section">
              <label>Type</label>
              <input
                type="text"
                value={selected.apartmentType}
                onChange={(e) => handleInputChange("apartmentType", e.target.value)}
                placeholder={placeholderText}
                readOnly={!editableType}
              />
            </div>
            <div className="summary-section">
              <label>Email</label>
              <input type="email" placeholder="Enter your email" value={selected.email} onChange={(e) => handleInputChange("email", e.target.value)} />
            </div>
            <div className="summary-section">
              <label>City</label>
              <input type="text" placeholder="City" value={selected.city} onChange={(e) => handleInputChange("city", e.target.value)} />
            </div>
            <div className="summary-section">
              <label>Carpet Area (sq. ft)</label>
              <input type="number" placeholder="e.g. 1200" value={selected.carpetArea} onChange={(e) => handleInputChange("carpetArea", e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Project message (will be saved)</label>
            <div className="selection-tags">
              {selected.custom_message ? <div className="tag">{selected.custom_message}</div> : <p className="placeholder">No message added yet.</p>}
            </div>
          </div>

          <button className="quote-btn" onClick={submitCustomEnquiry}>Submit Custom Enquiry</button>
        </div>
      </div>
    );
  };

  /* default/general catalog (1/2/3bhk) unchanged */
  const renderDefault = () => (
    <div className="catalog-layout">
      {/* LEFT PANEL */}
      <div className="catalog-left">
        {Object.entries(catalogOptions).map(([category, items]) => (
          <div className="selection-card" key={category}>
            <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
            <div className="option-list">
              {items.map((item) => (
                <button
                  key={item}
                  className={`option-btn ${selected[category].includes(item) ? "selected" : ""}`}
                  onClick={() => toggleSelection(category, item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT PANEL (SUMMARY) */}
      <div className="catalog-summary">
        <button className="back-btn" onClick={() => navigate("/interio")}> Back</button>
        <h2>Select Ideas You Are Open To</h2>

        <div className="summary-fields">
          <div className="summary-section">
            <label>Apartment Type</label>
            <input type="text" value={selected.apartmentType} readOnly className="readonly" />
          </div>

          <div className="summary-section">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" value={selected.email} onChange={(e) => handleInputChange("email", e.target.value)} />
          </div>

          <div className="summary-section">
            <label>City</label>
            <input type="text" placeholder="Enter your city" value={selected.city} onChange={(e) => handleInputChange("city", e.target.value)} />
          </div>

          <div className="summary-row">
            <div className="summary-section half">
              <label>No. of Washrooms</label>
              <input type="number" placeholder="e.g. 2" value={selected.washrooms} onChange={(e) => handleInputChange("washrooms", e.target.value)} />
            </div>
            <div className="summary-section half">
              <label>Carpet Area (sq. ft)</label>
              <input type="number" placeholder="e.g. 1200" value={selected.carpetArea} onChange={(e) => handleInputChange("carpetArea", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="summary-list">
          {["themes", "kitchens", "materials"].map((cat) => (
            <div key={cat} className="summary-category">
              <h4>{cat.charAt(0).toUpperCase() + cat.slice(1)}</h4>
              <div className="selection-tags">
                {selected[cat].length ? (
                  selected[cat].map((item) => (
                    <span key={item} className="tag">
                      {item}
                      <button onClick={() => handleRemoveSelection(cat, item)} className="remove-btn">✕</button>
                    </span>
                  ))
                ) : (
                  <p className="placeholder">No {cat} selected.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="quote-btn" onClick={submitDefaultEnquiry}>Get in Touch & Start Designing</button>
      </div>
    </div>
  );

  /* ---------- Decide which renderer to show ---------- */
  if (type && type.toLowerCase() === "bathroom") return renderBathroom();
  if (type && type.toLowerCase() === "kitchen") return renderKitchen();
  if (is3Plus(type) || (type && commercialTypes.includes(type.toLowerCase()))) return renderCustom();
  return renderDefault();
}
