import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/components/Header.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavClick = (path) => {
    setMenuOpen(false); // close menu after clicking
    navigate(path);
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/">
          <img src="/atenwhitelogo.png" alt="aTen Logo" className="logo-header" />
        </Link>

        {/* Hamburger icon */}
        <div
          className={`hamburger ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div></div>
        {/* Nav menu (includes links + auth) */}
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}><img className="whatsapp" src="/whatsapp.png" alt="" />9903611999</Link>
    

          <div className="mobile-auth">
            {!user ? (
              <button
                onClick={() => handleNavClick("/login")}
                className="login-btn"
              >
                Login
              </button>
            ) : (
              <div className="user-section">
                <span className="username">Hi, {user.name || "User"}</span>
                <button onClick={logout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
