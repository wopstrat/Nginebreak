import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import { activateAdminMode } from "../utils/adminAuth";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";
import "./Login.css";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Car,
  Bike,
  AlertCircle,
  X,
  Calendar,
  ExternalLink,
} from "lucide-react";

// ── Dummy Insights / Blogs / Events (Admin-manageable) ───────
const INSIGHTS_DATA = [
  {
    id: "blog-1",
    type: "BLOG",
    date: "Sep 05, 2025",
    title: "5 Simple Car Maintenance Habits for a Longer Life",
    desc: "From regular fluid checks to proactive tire rotations, discover the small routines that prevent major repair bills.",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=600&q=80",
    readTime: "4 min read",
  },
  {
    id: "meetup-1",
    type: "MEETUP",
    date: "Sep 20, 2025",
    title: "NGINEBREAK Community Drive & Meetup",
    desc: "Join fellow automobile and motorcycle enthusiasts for a weekend mountain pass drive and garage tech talk.",
    image: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=600&q=80",
    readTime: "Live Event",
  },
  {
    id: "blog-2",
    type: "BLOG",
    date: "Aug 28, 2025",
    title: "When to Replace Your Tyres? A Simple Guide",
    desc: "Learn how to read tread wear indicators, detect uneven alignment, and keep your contact patch safe in all weather.",
    image: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80",
    readTime: "3 min read",
  },
];

export default function Login() {
  const { login, register } = useGarage();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeArticle, setActiveArticle] = useState(null);

  const cardsContainerRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setLoading(true);
    setError("");

    try {
      // Attempt standard login via Supabase
      await login(form.email, form.password);

      // Activate admin view-mode if this is the configured admin email
      // activateAdminMode validates against VITE_ADMIN_EMAIL internally
      activateAdminMode(form.email.trim());

      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth login (Google / GitHub)
  const handleOAuthLogin = async (provider) => {
    if (!isSupabaseConfigured() || !supabase) {
      setError("Authentication service is not configured. Please contact the administrator.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (oauthError) throw oauthError;
      // Redirect is handled by Supabase — user comes back authenticated
    } catch (err) {
      setError(err.message || `Failed to sign in with ${provider}. Please try again.`);
      setLoading(false);
    }
  };

  const scrollCards = (direction) => {
    if (cardsContainerRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      cardsContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="login-portal">
      <div className="login-portal-inner">

        {/* ── TOP SECTION: Hero & Auth Card ───────────────── */}
        <div className="login-top-grid">

          {/* Left Column: Brand Hero Showcase */}
          <div className="login-hero">
            {/* Logo */}
            <div className="login-brand-logo">
              <div className="brand-title">
                <span className="brand-n">N</span>GINEBREAK
                <span className="brand-tm">TM</span>
              </div>
              <div className="brand-tagline">YOUR VEHICLE. YOUR STORY.</div>
            </div>

            {/* Headline */}
            <div className="login-hero-headline">
              <h1 className="hero-main-heading">
                More than<br />a Garage.
              </h1>
              <div className="hero-accent-bar" />
              <div className="hero-pillars">
                <span className="hero-pillar-item">TRACK</span>
                <span className="hero-pillar-item">MAINTAIN</span>
                <span className="hero-pillar-item">BUILD</span>
                <span className="hero-pillar-item">SHARE</span>
              </div>
            </div>

            {/* Vector Vehicle Graphic with Dynamic Orange Speed Slash */}
            <div className="hero-graphic-box">
              <div className="hero-speed-wedge" />
              <svg
                className="hero-vehicle-svg"
                viewBox="0 0 520 280"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Modern SUV / Crossover Technical Outline */}
                <g stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  {/* Roofline and body contours */}
                  <path d="M70 195 C110 195 135 155 170 145 C230 135 340 132 400 140 C445 146 470 170 485 195" fill="none" strokeWidth="2.8" />
                  <path d="M170 145 L205 92 C215 80 235 75 260 75 L370 78 C395 78 415 88 430 108 L460 148" fill="none" strokeWidth="2.6" />
                  {/* Window pillars */}
                  <path d="M295 78 L285 140" strokeWidth="2" />
                  <path d="M380 79 L370 142" strokeWidth="2" />
                  {/* Beltline & character creases */}
                  <path d="M85 175 L475 175" strokeWidth="1.8" strokeDasharray="6 3" stroke="#475569" />
                  <path d="M120 185 C170 182 320 182 450 188" strokeWidth="1.8" />
                  {/* Wheel Arches */}
                  <path d="M110 205 C110 160 170 160 170 205" strokeWidth="3.2" stroke="#0F172A" />
                  <path d="M375 205 C375 160 435 160 435 205" strokeWidth="3.2" stroke="#0F172A" />
                  {/* Wheels */}
                  <circle cx="140" cy="205" r="28" fill="#F8FAFC" strokeWidth="3" stroke="#0F172A" />
                  <circle cx="140" cy="205" r="14" fill="#E2E8F0" strokeWidth="2" stroke="#FF4D00" />
                  <circle cx="405" cy="205" r="28" fill="#F8FAFC" strokeWidth="3" stroke="#0F172A" />
                  <circle cx="405" cy="205" r="14" fill="#E2E8F0" strokeWidth="2" stroke="#FF4D00" />
                  {/* Front & Rear bumpers & lights */}
                  <path d="M470 155 L490 162 C495 168 495 180 488 190 L475 205" strokeWidth="2.5" />
                  <path d="M70 195 L65 205 L110 205" strokeWidth="2.5" />
                  <path d="M170 205 L375 205" strokeWidth="3" stroke="#0F172A" />
                  <path d="M435 205 L475 205" strokeWidth="2.5" />
                  {/* Tail lights subtle accent */}
                  <path d="M85 168 L105 168 L100 178 L80 178 Z" fill="rgba(239, 68, 68, 0.4)" stroke="#EF4444" strokeWidth="1.6" />
                </g>
              </svg>
            </div>

            {/* Community footer */}
            <div className="hero-community-bar">
              <div className="hero-vehicle-icons">
                <Car size={18} />
                <Bike size={18} />
              </div>
              <span className="hero-comm-sep">|</span>
              <span className="hero-comm-label">ALL VEHICLES. ONE COMMUNITY.</span>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="login-card-container">
            <div className="login-auth-card">
              <div className="auth-card-head">
                <h2 className="auth-card-title">Welcome Back</h2>
                <p className="auth-card-sub">Login to continue your journey</p>
              </div>

              {error && (
                <div className="auth-error" style={{ marginBottom: 14 }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form-body" autoComplete="on">
                {/* Email Address */}
                <div className="input-field-group">
                  <Mail size={17} className="input-lead-icon" />
                  <input
                    type="email"
                    name="email"
                    id="login-email"
                    className="input-text-ctrl"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                {/* Password with Eye toggle */}
                <div className="input-field-group">
                  <Lock size={17} className="input-lead-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="login-password"
                    className="input-text-ctrl"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-trail-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Aux row: Keep me signed in & Forgot password */}
                <div className="auth-aux-row">
                  <label className="remember-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="remember-checkbox"
                    />
                    <span>Keep me signed in</span>
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset instructions will be sent to your registered email address.");
                    }}
                    className="forgot-link"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    "Signing in…"
                  ) : (
                    <>
                      <LogIn size={16} /> Login
                    </>
                  )}
                </button>

                {/* Social Login Divider */}
                <div className="social-sep-row">
                  <span className="social-sep-text">or continue with</span>
                </div>

                {/* Social OAuth Buttons */}
                <div className="social-buttons-grid">
                  <button
                    type="button"
                    className="social-oauth-btn"
                    onClick={() => handleOAuthLogin("google")}
                    disabled={loading}
                    title="Sign in with Google"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    Google
                  </button>

                  <button
                    type="button"
                    className="social-oauth-btn"
                    onClick={() => handleOAuthLogin("github")}
                    disabled={loading}
                    title="Sign in with GitHub"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#24292F">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    GitHub
                  </button>
                </div>

                {/* Footer link to Register */}
                <p className="auth-footer-prompt">
                  New here?
                  <Link to="/register" className="auth-create-link">
                    Create an account
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION: Dedicated Insights / Blogs & Meetups ── */}
        <div className="login-insights-wrapper">
          <div className="insights-header-row">
            {/* Header info */}
            <div className="insights-title-area">
              <div className="insights-kicker">
                <span className="kicker-line" />
                <span>INSIGHTS & EVENTS</span>
              </div>
              <h3 className="insights-heading">Blogs & Meetups</h3>
              <p className="insights-description">
                Learn, share and be part of a growing community of vehicle enthusiasts.
              </p>
              <button
                type="button"
                className="view-all-pill-btn"
                onClick={() => alert("All community posts and upcoming events will open in the Community Hub!")}
              >
                View All <ArrowRight size={13} />
              </button>
            </div>

            {/* Navigation arrows and handwritten slogan */}
            <div className="insights-header-controls">
              <div className="insights-nav-arrows">
                <button
                  type="button"
                  className="arrow-circle-btn"
                  onClick={() => scrollCards("left")}
                  aria-label="Previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="arrow-circle-btn arrow-primary"
                  onClick={() => scrollCards("right")}
                  aria-label="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="brand-handwritten-slogan">
                <span className="script-text">Small Care,</span>
                <span className="script-text" style={{ color: "#FF4D00" }}>Longer Journeys</span>
                <div className="script-accent-swoosh" />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="insights-cards-grid" ref={cardsContainerRef}>
            {INSIGHTS_DATA.map((item) => (
              <div
                key={item.id}
                className="insight-card"
                onClick={() => setActiveArticle(item)}
              >
                <div className="insight-card-media">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="insight-card-img"
                    loading="lazy"
                  />
                  <span
                    className={`insight-card-badge ${
                      item.type === "BLOG" ? "badge-blog" : "badge-meetup"
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
                <div className="insight-card-content">
                  <div className="insight-card-date">{item.date}</div>
                  <h4 className="insight-card-title">{item.title}</h4>
                  <div className="insight-card-action">
                    <ArrowRight size={16} className="action-arrow-icon" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Article / Preview Modal ────────────────────── */}
      {activeArticle && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setActiveArticle(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              maxWidth: 480,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ height: 180, position: "relative" }}>
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                onClick={() => setActiveArticle(null)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)",
                  color: "#FFFFFF",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    color: "var(--accent-color)",
                    textTransform: "uppercase",
                  }}
                >
                  {activeArticle.type}
                </span>
                <span style={{ color: "#94A3B8" }}>•</span>
                <span style={{ fontSize: "0.74rem", color: "#64748B" }}>
                  {activeArticle.date}
                </span>
              </div>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#0F172A",
                  margin: "0 0 10px 0",
                }}
              >
                {activeArticle.title}
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#475569",
                  lineHeight: 1.5,
                  margin: "0 0 20px 0",
                }}
              >
                {activeArticle.desc}
              </p>
              <button
                className="btn-orange"
                style={{ width: "100%", justifyContent: "center", padding: "10px" }}
                onClick={() => setActiveArticle(null)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
