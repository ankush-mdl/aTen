import React, { useState } from "react";
import { auth, RecaptchaVerifier } from "../firebaseConfig";
import { signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../assets/components/PhoneLogin.css";

export default function PhoneLogin() {
  // New: choose user or admin on same page
  const [isAdmin, setIsAdmin] = useState(false);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      // Keep same behavior you had; this was working for users so we reuse it
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: (response) => console.log("reCAPTCHA verified", response),
      });
    }
  };

  const sendOtp = async () => {
    try {
      setLoading(true);
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = "+91" + phone.replace(/\D/g, "");
      console.log("Sending OTP to:", formattedPhone);
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmation(confirmationResult);
      toast.success("OTP sent successfully!");
    } catch (error) {
      console.error("sendOtp error:", error);
      toast.error("Failed to send OTP");
      // optional cleanup if needed:
      try {
        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch (e) {}
          delete window.recaptchaVerifier;
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      const result = await confirmation.confirm(otp);
      const phoneNumber = result.user.phoneNumber; // e.g. "+911234567890"
      console.log("Firebase verified phone:", phoneNumber);

      // Choose endpoint depending on role
      const endpoint = isAdmin ? "http://localhost:5000/api/auth/admin" : "http://localhost:5000/api/auth";

      // backend expects { name, phone } in your original code; keep same contract
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phoneNumber }),
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.error || `Server responded ${res.status}`);
      }

      const data = await res.json();
      // data.user should include id, name, phone (backend contract)
      if (data.user) {
        const user = {
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone,
          isAdmin: !!(isAdmin || data.user.isAdmin),
        };

        // keep same localStorage usage as before
        localStorage.setItem("user", JSON.stringify(user));
        // also call context login if available
        if (typeof login === "function") {
          try { login(user); } catch (e) { /* ignore if login signature differs */ }
        }

        toast.success(isAdmin ? "Admin login successful" : "Login successful");

        // navigate to admin dashboard if admin else home
        if (user.isAdmin) {
          navigate("/admin/dashboard");
        } else {
          navigate("/");
        }

        // reload if your app expects it (you were reloading earlier)
        window.location.reload();
      } else {
        toast.error("Failed to log in");
      }
    } catch (error) {
      console.error("verifyOtp error:", error);
      toast.error("Invalid OTP or Name doesn't match Phone");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-login-page">
      {/* Role toggle — minimal UI so you can reuse the same page */}
      <div style={{ display: "flex", marginBottom: "0.75rem" }}>
        <button
          type="button"
          className={`role-btn ${!isAdmin ? "active" : ""}`}
          onClick={() => setIsAdmin(false)}
          disabled={loading}
        >
          User
        </button>
        <button
          type="button"
          className={`role-btn ${isAdmin ? "active" : ""}`}
          onClick={() => setIsAdmin(true)}
          disabled={loading}
        >
          Admin
        </button>
      </div>

      <h1>{isAdmin ? "Admin Phone Login" : "Phone Login"}</h1>

      {!confirmation ? (
        <>
          <input
            type="text"
            placeholder="Enter Name"
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="phone-wrapper">
            <span className="phone-prefix">+91</span>
            <input
              type="tel"
              maxLength="10"
              placeholder="Enter phone number"
              className="phone-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <button
            onClick={sendOtp}
            className="send-btn"
            disabled={loading || !phone || !name}
          >
            {loading ? <div className="spinner"></div> : "Send OTP"}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            className="otp-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button
            onClick={verifyOtp}
            className="verify-btn"
            disabled={loading || !otp}
          >
            {loading ? <div className="spinner"></div> : "Verify OTP"}
          </button>
        </>
      )}

      <div id="recaptcha-container"></div>
    </div>
  );
}
