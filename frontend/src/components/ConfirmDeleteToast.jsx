import React from "react";
import toast from "react-hot-toast";

export default function showDeleteConfirm({
  title = "Delete Item?",
  message = "This action cannot be undone.",
  onConfirm,
  duration = 5000,
}) {
  const id = toast.custom(
    (t) => (
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
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
          <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
            {message}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 6,
          }}
        >
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
              try {
                onConfirm && onConfirm();
              } catch (err) {
                console.error(err);
              }
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
    ),
    { duration }
  );

  return id;
}
