// src/components/PhoneLogin.jsx
import React, { useState, useEffect } from "react";
import { auth, createRecaptchaVerifier } from "../firebaseConfig";
import { signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../assets/components/PhoneLogin.css";

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("input");
  const { loginWithFirebaseIdToken } = useAuth();
  const navigate = useNavigate();

  localStorage.setItem("login_name", name);
  useEffect(() => {
    return () => {
      try {
        if (window.recaptchaVerifier) delete window.recaptchaVerifier;
      } catch (e) {}
    };
  }, []);

  function setupRecaptcha() {
    try {
      if (typeof createRecaptchaVerifier === "function") createRecaptchaVerifier();
      return window.recaptchaVerifier || null;
    } catch (e) {
      console.warn("Recaptcha init failed:", e);
      return null;
    }
  }

  async function sendOtp() {
    const rawPhone = String(phone || "").trim();
    if (!rawPhone) return toast.error("Enter phone number");

    setLoading(true);
    try {
      const verifier = setupRecaptcha();
      let formatted = rawPhone;
      if (!formatted.startsWith("+")) formatted = `+91${formatted.replace(/^0+/, "")}`;

      if (!verifier) throw new Error("reCAPTCHA not initialized");

      const confirmationResult = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmation(confirmationResult);
      setStep("otp");
      toast.success("OTP sent — check your phone");
    } catch (err) {
      console.error("sendOtp error", err);
      toast.error(err?.message || "Failed to send OTP");
      try { if (window.recaptchaVerifier) delete window.recaptchaVerifier; } catch (e) {}
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!confirmation) return toast.error("Send OTP first");
    const code = String(otp || "").trim();
    if (!code) return toast.error("Enter OTP");
    setLoading(true);
    try {
      const result = await confirmation.confirm(code);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem("auth_token", idToken);
      await loginWithFirebaseIdToken(idToken);
      toast.success("Logged in");// force refresh
      setStep("done");
      navigate("/");
    } catch (err) {
      console.error("verifyOtp error", err);
      toast.error("OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setPhone("");
    setOtp("");
    setConfirmation(null);
    setStep("input");
    try { if (window.recaptchaVerifier) delete window.recaptchaVerifier; } catch (e) {}
  }

  return (
    <div className="phone-login-page">
      <div className="phone-login-card">
        <h2 className="login-title">Sign in with phone</h2>

        {step === "input" && (
          <>
            <input
              id="name"
              className="name-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="phone-row">
              <div className="phone-prefix">+91</div>
              <input
                id="phone"
                className="phone-input"
                placeholder="10 digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
            </div>

            <button
              className="send-btn"
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="otp-instruction">OTP sent to <strong>{phone}</strong></div>

            <input
              id="otp"
              className="otp-input"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
            />

            <div className="otp-actions">
              <button className="verify-btn" onClick={verifyOtp} disabled={loading}>
                {loading ? "Verifying..." : "Verify & Sign in"}
              </button>
              <button className="secondary-btn" onClick={resetAll} disabled={loading}>
                Start over
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="done-box">
            <p>Login successful — redirecting...</p>
            <button className="secondary-btn" onClick={() => navigate("/")}>Go to home</button>
          </div>
        )}

        <div id="recaptcha-container" />

        <div className="login-note">
        </div>
      </div>
    </div>
  );
}
