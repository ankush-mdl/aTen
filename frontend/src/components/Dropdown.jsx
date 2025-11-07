// src/components/Dropdown.jsx
import React, { useState, useRef, useEffect } from "react";
import "../assets/pages/Project.css"; // ensure the styles are present

/**
 * Accessible themed dropdown component (replacement for native <select>)
 *
 * Props:
 * - value: current value (string)
 * - onChange: (value) => void
 * - options: array of { value, label } OR array of strings
 * - placeholder: string (shown when value is empty)
 * - id: optional id for accessibility
 * - className: additional wrapper class
 */
export default function Dropdown({
  value,
  onChange,
  options = [],
  placeholder = "",
  id,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // normalize options to { value, label }
  const normalized = Array.isArray(options)
    ? options.map((opt) => {
        if (opt && typeof opt === "object") return { value: String(opt.value), label: String(opt.label || opt.value) };
        return { value: String(opt), label: String(opt) };
      })
    : [];

  const selected = normalized.find((o) => String(o.value) === String(value)) || null;

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // keyboard navigation when list opens
  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll("[role='option']"));
    let idx = items.findIndex((it) => it.getAttribute("data-value") === String(value));
    if (idx < 0) idx = 0;
    items[idx]?.focus();

    function onKey(e) {
      if (e.key === "ArrowDown") {
        idx = Math.min(items.length - 1, idx + 1);
        items[idx]?.focus();
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        idx = Math.max(0, idx - 1);
        items[idx]?.focus();
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        const v = document.activeElement?.getAttribute("data-value");
        if (v !== null && v !== undefined) {
          // "__empty__" signals clearing selection
          onChange(v === "__empty__" ? "" : v);
        }
        setOpen(false);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }

    const el = listRef.current;
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [open, value, onChange]);

  function pick(v) {
    setOpen(false);
    onChange(v === "__empty__" ? "" : v);
  }

  const label = selected ? selected.label : (placeholder || "Select");

  return (
    <div ref={rootRef} className={`dropdown-wrap ${className}`} style={{ position: "relative" }}>
      <button
        type="button"
        id={id}
        className="dropdown-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setTimeout(() => listRef.current?.querySelector("[role='option']")?.focus(), 0);
          }
        }}
      >
        <span className={`dropdown-label ${selected ? "" : "muted"}`}>{label}</span>
        <span className="dropdown-arrow" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul ref={listRef} role="listbox" aria-labelledby={id} className="dropdown-list" tabIndex={-1}>
          <li
            role="option"
            tabIndex={0}
            data-value="__empty__"
            className={`dropdown-item ${String(value) === "" ? "selected" : ""}`}
            onClick={() => pick("__empty__")}
            onKeyDown={(e) => {
              if (e.key === "Enter") pick("__empty__");
            }}
          >
            <div className="dropdown-item-label muted">All</div>
          </li>

          {normalized.map((opt) => (
            <li
              key={opt.value}
              role="option"
              tabIndex={0}
              data-value={opt.value}
              className={`dropdown-item ${String(opt.value) === String(value) ? "selected" : ""}`}
              onClick={() => pick(opt.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") pick(opt.value);
              }}
            >
              <div className="dropdown-item-label">{opt.label}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
