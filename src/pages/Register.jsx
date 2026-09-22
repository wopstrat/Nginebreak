import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import StorageService from "../services/StorageService";
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, Info, ExternalLink } from "lucide-react";

export default function Register() {
  const { register } = useGarage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [success, setSuccess] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      setIsRateLimit(false);
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsRateLimit(false);
      return;
    }
    setLoading(true);
    setError("");
    setIsRateLimit(false);
    try {
      const result = await register(form.email, form.password, form.name);
      StorageService.setOnboardingCompleted(form.email, false);
      
      // If Supabase has email confirmations disabled or auto-confirms, session exists immediately
      if (result?.session) {
        setSuccess("Account created! Redirecting to your garage...");
        setTimeout(() => navigate("/"), 1200);
      } else {
        // Confirmation email required
        setSuccess("Account created! Check your email to confirm your account before signing in, or disable 'Confirm email' in Supabase for instant login.");
        setTimeout(() => navigate("/login"), 3500);
      }
    } catch (err) {
      const msg = err.message || "Registration failed. Please try again.";
      setError(msg);
      if (msg.toLowerCase().includes("rate limit")) {
        setIsRateLimit(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-n">N</span>GINEBREAK
          <div className="auth-logo-sub">Shared Vehicle Maintenance</div>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">Join and start managing your shared garage</p>

          {error && (
            <div className="auth-error" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
              {isRateLimit && (
                <div style={{ marginTop: 6, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.45, background: "var(--bg-page)", padding: 10, borderRadius: 6, width: "100%", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Info size={13} color="var(--accent-color)" /> How to fix in Supabase:
                  </div>
                  <div>1. Go to <strong>Supabase Dashboard</strong> &rarr; <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; <strong>Email</strong></div>
                  <div>2. Toggle off <strong>"Confirm email"</strong> and click <strong>Save</strong></div>
                  <div style={{ marginTop: 4, color: "var(--text-muted)" }}>This removes the 3-emails/hr rate limit and activates accounts instantly.</div>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="auth-success" style={{ alignItems: "flex-start" }}>
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
            <div className="auth-field">
              <label className="auth-label">Display Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  name="name"
                  id="reg-name"
                  className="auth-input"
                  placeholder="e.g. Arjun"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoComplete="name"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  name="email"
                  id="reg-email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  name="password"
                  id="reg-password"
                  className="auth-input"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  id="reg-confirm-password"
                  className="auth-input"
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-orange auth-btn"
              disabled={loading || !!success}
            >
              <UserPlus size={16} />
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
