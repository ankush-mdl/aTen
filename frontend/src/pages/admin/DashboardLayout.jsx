// src/pages/admin/DashboardLayout.jsx
import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../../assets/pages/admin/ProjectsAdmin.css"; // reuse admin CSS for layout basics
import "../../assets/pages/admin/ProjectForm.css"; // optional - for form styles in nested route
import { useAuth } from "../../context/AuthContext";

/**
 * DashboardLayout
 * - Sidebar navigation for admin sections
 * - Topbar with simple user / logout control
 * - Renders nested routes via <Outlet />
 */
export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth?.() || {}; // graceful if useAuth is not provided

  const handleLogout = async () => {
    try {
      if (typeof logout === "function") await logout();
    } catch (err) { /* ignore */ }
    // clear local storage user and navigate to login
    localStorage.removeItem("user");
    navigate("/login");
  };

  const activeClass = ({ isActive }) => (isActive ? "admin-nav-link active" : "admin-nav-link");

  return (
  <div className="admin-shell" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* SIDEBAR */}
     <aside
  style={{
    width: 260,
    padding: 20,
    background: "#25261E",
    borderRight: "1px solid rgba(15,23,42,0.04)",
    boxShadow: "0 6px 20px rgba(2,6,23,0.04)",
    position: "sticky", // keeps it fixed in the viewport
    top: 0,
    height: "100vh",
    overflow: "hidden", // prevents sidebar scroll
    display: "flex",
    flexDirection: "column",
    justifyContent: "start",
  }}
>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ margin: 0, color:"#D9C4B8"
           }}>Admin Dashboard</h3>
          <div style={{ color: "#F2E8E4", marginTop: 6, fontSize: 13 }}>
            {user?.name || "Administrator"}
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <NavLink to="/admin/dashboard" className={activeClass}>Dashboard</NavLink>

          <div style={{ marginTop: 8, fontSize: 12, color: "#F2E8E4", fontWeight: 700 }}>Realty</div>
          <NavLink to="/admin/projects" className={activeClass}>Projects</NavLink>
          <NavLink to="/admin/projects/new" className={activeClass}>Add Project</NavLink>

          {/* if you have other admin sections, add them here */}
          <div style={{ marginTop: 12, fontSize: 12, color: "#F2E8E4", fontWeight: 700 }}>Site</div>
          <NavLink to="/admin/testimonials" className={activeClass}>Testimonials</NavLink>
          <NavLink to="/admin/pricing" className={activeClass}>Pricing</NavLink>
        </nav>

        <div style={{ marginTop: 20 }}>
          <button onClick={() => navigate("/")} style={{ width: "100%", "color":"#F2E8E4", padding: "8px 10px", borderRadius: 8, border: "1px solid #F2E8E4", background: "transparent" }}>
            View site
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
     <main
  style={{
    flex: 1,
    padding: 22,
    background: "#F2E8E4",
    height: "100vh",
    overflowY: "auto", // scroll only the main content
  }}
>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Admin</h2>
            <div style={{ color: "#F2E8E4", marginTop: 4, fontSize: 13 }}>
              Manage projects, enquiries and other site content
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ color: "#0D0D0C" }}>{user?.phone || "—"}</div>
            <button onClick={handleLogout} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(15,23,42,0.06)", background: "transparent" }}>
              Sign out
            </button>
          </div>
        </header>

        {/* Outlet for nested admin routes */}
        <section style={{ background: "transparent" }}>
          <Outlet />
        </section>
      </main>
    </div>
  );
}
