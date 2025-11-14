// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

// Create the context
const AuthContext = createContext();

// Hook for components
export function useAuth() {
  return useContext(AuthContext);
}

// Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, name, phone, isAdmin }
  const [token, setToken] = useState(null); // firebase id token
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("auth_token");
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedToken) setToken(storedToken);
    } catch (e) {
      console.error("Error reading auth from localStorage", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      if (user) localStorage.setItem("user", JSON.stringify(user));
      else localStorage.removeItem("user");
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    try {
      if (token) localStorage.setItem("auth_token", token);
      else localStorage.removeItem("auth_token");
    } catch (e) {}
  }, [token]);

  // Called after Firebase phone auth is successful: send ID token to backend to create/return user
// inside AuthContext.jsx - replace loginWithFirebaseIdToken with this version
async function loginWithFirebaseIdToken(idToken) {
  setLoading(true);
  try {
    // Save token first so apiFetch will include it in Authorization header
    localStorage.setItem("auth_token", idToken);

    const res = await apiFetch("/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}) // backend reads token, so body can be empty
    });

    if (!res.ok) {
      localStorage.removeItem("auth_token");
      throw new Error(res.data?.error || "Auth failed");
    }

    // backend returns res.data.user with shape { id, uid, phone, name, isAdmin }
    const user = res.data.user;
    if (!user || typeof user.id === "undefined") {
      // defensive: if backend shape is unexpected, clear token and fail
      localStorage.removeItem("auth_token");
      throw new Error("Invalid auth response from server");
    }

    setUser(user);
    setToken(idToken);
    return user;
  } catch (err) {
    localStorage.removeItem("auth_token");
    setUser(null);
    setToken(null);
    throw err;
  } finally {
    setLoading(false);
  }
}


  function logout() {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("login_name");
      localStorage.removeItem("customer_phone");
    } catch (e) {}
  }

  const value = {
    user,
    token,
    loading,
    loginWithFirebaseIdToken,
    logout,
    isAdmin: user?.isAdmin === true,
    isLoggedIn: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
