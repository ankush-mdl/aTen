// src/components/AdminGuard.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminGuard({ allowedPhones = [] }) {
  const { user } = useAuth?.() || {};
  if (!user) return <Navigate to="/login" replace />;
  // simple check: phone number in allowed list or user.isAdmin flag
  const phone = user.phone || "";
  if (user.isAdmin || allowedPhones.includes(phone)) return <Outlet />;
  return <Navigate to="/login" replace />;
}
