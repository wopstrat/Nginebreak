import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import MaintenanceCard from "../components/MaintenanceCard";
import { STATUS, getPartCategory, getVehicleSummary, getVehicleFitnessStats } from "../services/CalculationEngine";
import {
  ChevronLeft,
  Plus,
  Gauge,
  UploadCloud,
  Trash2,
  Users,
  UserPlus,
  Clock,
  AlertTriangle,
  Mail,
  Crown,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { uploadVehiclePhoto, formatBytes } from "../utils/imageOptimizer";

function getVehicleIcon(type) {
  const map = {
    Motorcycle: "🏍️",
    Scooter: "🛵",
    EV: "⚡",
    Bus: "🚌",
    Truck: "🚛",
    Van: "🚐",
    SUV: "🚙",
  };
  return map[type] || "🚗";
}

const TABS = ["Overview", "Maintenance", "History", "Members", "Media"];

export default function VehicleProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    vehicles,
    updateOdometer,
    addVehicleMedia,
    removeVehicleMedia,
    inviteMember,
    getGarageMembers,
    currentUser,
  } = useGarage();
  const vehicle = vehicles.find((v) => v.id === id);

  const [activeTab, setActiveTab] = useState("Overview");
  const [partCategory, setPartCategory] = useState("All");
  const CATEGORIES = ["All", "Engine", "Fluids", "Filters", "Brakes"];
  const [showOdoUpdate, setShowOdoUpdate] = useState(false);
  const [newOdo, setNewOdo] = useState("");
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = React.useRef(null);

  // Members state
  const [members, setMembers] = useState(vehicle?.members || []);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Open odo modal if coming from dashboard shortcut
  useEffect(() => {
    if (sessionStorage.getItem("openOdoModal") === "1") {
      sessionStorage.removeItem("openOdoModal");
      setShowOdoUpdate(true);
      setActiveTab("Overview");
    }
  }, []);

  // Refresh members when switching to Members tab
  useEffect(() => {
    if (activeTab === "Members") {
      getGarageMembers(id).then((data) => setMembers(data));
    }
  }, [activeTab, id, getGarageMembers]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setUploadSuccess(null);
      const result = await uploadVehiclePhoto(file, id);
      const mediaItem = {
        id: (Date.now() + Math.random()).toString(),
        url: result.url,
        name: file.name.replace(/\.[^/.]+$/, ""),
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
        savedPercent: result.savedPercent,
        created_at: new Date().toISOString(),
      };
      await addVehicleMedia(id, mediaItem);
      setUploadSuccess(
        `Optimized! ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.savedPercent}% saved)`
      );
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err) {
      alert("Photo upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!vehicle)
    return (
      <div className="app-container" style={{ paddingTop: 40 }}>
        <p style={{ color: "var(--text-muted)" }}>Vehicle not found.</p>
      </div>
    );

  const mods = vehicle.maintenance_modules || [];
  const overdue = mods.filter((m) => m.status === STATUS.OVERDUE);
  const dueSoon = mods.filter((m) => m.status === STATUS.DUE_SOON);
  const upcoming = mods.filter((m) => m.status === STATUS.UPCOMING);
  const healthScore =
    mods.length > 0
      ? Math.round(((mods.length - overdue.length) / mods.length) * 100)
      : 100;

  const handleOdoUpdate = async (e) => {
    e.preventDefault();
    const val = parseInt(newOdo);
    if (!newOdo || val <= vehicle.current_odometer) {
      alert("New odometer must be greater than current reading.");
      return;
    }
    setSaving(true);
    await updateOdometer(id, val);
    setSaving(false);
    setNewOdo("");
    setShowOdoUpdate(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const newMember = await inviteMember(id, inviteEmail.trim());
      setInviteSuccess(`${newMember.display_name} has been added as a member!`);
      setInviteEmail("");
      // Refresh members list
      const updated = await getGarageMembers(id);
      setMembers(updated);
      setTimeout(() => setInviteSuccess(""), 4000);
    } catch (err) {
      setInviteError(err.message || "Could not invite member.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: 0 }}>
      {/* ── Header ────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: 0,
            }}
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {vehicle.type}
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: "1.3rem" }}>
              {vehicle.make} {vehicle.model}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Vehicle Hero Card ─────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #FF4D00 0%, #FF8A50 100%)",
          borderRadius: 16,
          padding: "20px",
          marginBottom: 16,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            fontSize: "5rem",
            opacity: 0.12,
          }}
        >
          {getVehicleIcon(vehicle.type)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.01em" }}>
              {vehicle.make} {vehicle.model}
            </div>
            <div style={{ opacity: 0.8, fontSize: "0.82rem", marginTop: 2 }}>
              {vehicle.year} · {vehicle.type}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: "0.72rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Users size={11} /> {(vehicle.members || []).length} Members
          </div>
        </div>

        {/* Odometer + Update */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "0.68rem", opacity: 0.75, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
              Current Odometer
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.8rem", lineHeight: 1 }}>
              {vehicle.current_odometer?.toLocaleString()} km
            </div>
          </div>
          <button
            onClick={() => setShowOdoUpdate((s) => !s)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1.5px solid rgba(255,255,255,0.4)",
              color: "#fff",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(4px)",
            }}
          >
            <Gauge size={14} /> Update
          </button>
        </div>

        {/* Health bar */}
        {mods.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: "0.7rem", opacity: 0.8, fontWeight: 600 }}>
                Vehicle Health
              </span>
              <span style={{ fontSize: "0.7rem", fontWeight: 800 }}>
                {healthScore}%
              </span>
            </div>
            <div
              style={{
                height: 5,
                background: "rgba(255,255,255,0.25)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${healthScore}%`,
                  background: "#fff",
                  borderRadius: 4,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Odometer Update Form ──────────────── */}
      {showOdoUpdate && (
        <div className="garage-card" style={{ marginBottom: 16, padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: 4 }}>
            Update Odometer
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
            Current: <strong style={{ color: "var(--accent-color)" }}>{vehicle.current_odometer?.toLocaleString()} km</strong>.
            New value will be logged with your name and shared with all members.
          </div>
          <form onSubmit={handleOdoUpdate}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: 4, display: "block" }}>
                  New Odometer (km)
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder={`> ${vehicle.current_odometer}`}
                  value={newOdo}
                  onChange={(e) => setNewOdo(e.target.value)}
                  min={vehicle.current_odometer + 1}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn-orange"
                disabled={saving}
                style={{ padding: "10px 18px", flexShrink: 0 }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setShowOdoUpdate(false); setNewOdo(""); }}
                style={{ padding: "10px 14px", flexShrink: 0 }}
              >
                Cancel
              </button>
            </div>
          </form>
          <div style={{ marginTop: 10 }}>
            <Link
              to={`/odometer-history/${id}`}
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={12} /> View full odometer history →
            </Link>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 16,
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: 10,
          padding: 4,
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: "1 0 auto",
              padding: "7px 10px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab ? 700 : 500,
              fontSize: "0.78rem",
              background: activeTab === tab ? "var(--accent-color)" : "transparent",
              color: activeTab === tab ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ──────────────────────── */}
      {activeTab === "Overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(85px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-number" style={{ color: overdue.length > 0 ? "var(--danger-color)" : "var(--text-primary)" }}>
                {overdue.length}
              </div>
              <div className="stat-label">Overdue</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: dueSoon.length > 0 ? "var(--warning-color)" : "var(--text-primary)" }}>
                {dueSoon.length}
              </div>
              <div className="stat-label">Due Soon</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{upcoming.length}</div>
              <div className="stat-label">Upcoming</div>
            </div>
          </div>
          {mods.length === 0 ? (
            <div className="empty-state" style={{ padding: "28px 16px" }}>
              <div className="empty-icon">🔧</div>
              <h5>No maintenance items yet</h5>
              <p>Add your first maintenance schedule to start tracking.</p>
              <Link to={`/vehicle/${id}/add-maintenance`} className="btn-orange">
                <Plus size={15} /> Add Maintenance
              </Link>
            </div>
          ) : (
            <div>
              {[...overdue, ...dueSoon, ...upcoming].slice(0, 5).map((mod) => (
                <MaintenanceCard
                  key={mod.id}
                  mod={mod}
                  vehicleId={id}
                  currentOdometer={vehicle.current_odometer}
                />
              ))}
              {mods.length > 5 && (
                <button
                  className="btn-ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
                  onClick={() => setActiveTab("Maintenance")}
                >
                  View all {mods.length} items →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Maintenance Tab ───────────────────── */}
      {activeTab === "Maintenance" && (
        <div>
          {/* Option 1 Category Filter Pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setPartCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: partCategory === cat ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                  background: partCategory === cat ? 'rgba(249,115,22,0.12)' : 'var(--bg-card)',
                  color: partCategory === cat ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: partCategory === cat ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {mods.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔧</div>
              <h5>No maintenance schedules</h5>
              <p>Add services to track.</p>
              <Link to={`/vehicle/${id}/add-maintenance`} className="btn-orange">
                <Plus size={15} /> Add Maintenance
              </Link>
            </div>
          ) : (
            mods
              .filter(m => partCategory === "All" || getPartCategory(m.name) === partCategory)
              .map((mod) => (
                <MaintenanceCard
                  key={mod.id}
                  mod={mod}
                  vehicleId={id}
                  vehicle={vehicle}
                  currentOdometer={vehicle.current_odometer}
                />
              ))
          )}
        </div>
      )}

      {/* ── History Tab ───────────────────────── */}
      {activeTab === "History" && (
        <div>
          {(vehicle.service_history || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h5>No service records yet</h5>
              <p>Mark a maintenance item as done to start the history.</p>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div className="timeline-line" />
              {[...(vehicle.service_history || [])]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      marginBottom: 10,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <div className="timeline-dot">✓</div>
                    <div
                      className="garage-card"
                      style={{ flex: 1, marginBottom: 0, padding: "12px 14px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                            {h.module_name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                            {h.date}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: "var(--accent-color)", fontSize: "0.85rem" }}>
                          {h.odometer?.toLocaleString()} km
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Members Tab ───────────────────────── */}
      {activeTab === "Members" && (
        <div>
          {/* Current members */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={15} /> Members ({members.length})
            </div>
            {members.length === 0 ? (
              <div className="garage-card" style={{ padding: "14px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                No members yet. Invite your co-owners below.
              </div>
            ) : (
              members.map((m, idx) => {
                const isCurrentUser =
                  (m.user_id && currentUser?.id && m.user_id === currentUser.id) ||
                  (m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase());
                return (
                  <div key={m.user_id || m.email || idx} className="member-row">
                    <div className="member-avatar">
                      {m.display_name?.[0]?.toUpperCase() || m.email?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                        {m.display_name || m.email}
                        {isCurrentUser && (
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
                            (You)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 1 }}>
                        {m.joined_at
                          ? `Joined ${new Date(m.joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                          : "Member"}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        background: m.role === "owner" ? "var(--accent-light)" : "var(--bg-page)",
                        color: m.role === "owner" ? "var(--accent-color)" : "var(--text-muted)",
                        border: `1px solid ${m.role === "owner" ? "var(--accent-border)" : "var(--border-color)"}`,
                      }}
                    >
                      {m.role === "owner" && <Crown size={10} />}
                      {m.role === "owner" ? "Owner" : "Member"}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Invite form */}
          <div className="garage-card" style={{ padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <UserPlus size={15} /> Invite a Member
            </div>
            {!currentUser ? (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                  Guest users cannot invite members to garages. Please log in or sign up to add members.
                </p>
                <Link
                  to="/login"
                  className="btn-orange"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  Log In or Register
                </Link>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                  Enter the email address they used to register on NGINEBREAK.
                </div>

                {inviteError && (
                  <div className="auth-error" style={{ marginBottom: 10 }}>
                    <AlertTriangle size={14} />
                    <span>{inviteError}</span>
                  </div>
                )}
                {inviteSuccess && (
                  <div className="auth-success" style={{ marginBottom: 10 }}>
                    <CheckCircle2 size={14} />
                    <span>{inviteSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleInvite}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div className="auth-input-wrap" style={{ flex: 1 }}>
                      <Mail size={15} className="auth-input-icon" />
                      <input
                        type="email"
                        className="auth-input"
                        placeholder="friend@email.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-orange"
                      disabled={inviting}
                      style={{ padding: "10px 16px", flexShrink: 0 }}
                    >
                      {inviting ? "Adding…" : "Invite"}
                    </button>
                  </div>
                </form>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
                  The invited person must have an existing NGINEBREAK account.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Media Tab ─────────────────────────── */}
      {activeTab === "Media" && (
        <div>
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255,77,0,0.05) 0%, rgba(255,77,0,0.02) 100%)",
              border: "1px solid rgba(255,77,0,0.18)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "var(--accent-color)",
                color: "#fff",
                borderRadius: 8,
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                Space-Saving Mode Active
                <span style={{ fontSize: "0.7rem", background: "rgba(16,185,129,0.12)", color: "var(--success-color)", padding: "2px 7px", borderRadius: 20, fontWeight: 700 }}>
                  Lossless 1920px WebP
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                Photos are automatically processed into high-resolution WebP format — 100% sharp quality, ~95% smaller size.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Gallery &amp; Documents
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {(vehicle.media || []).length} items
              </span>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />
              <button
                className="btn-orange"
                style={{ padding: "8px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={16} />
                {uploading ? "Uploading…" : "Upload Photo"}
              </button>
            </div>
          </div>

          {uploadSuccess && (
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#065f46",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} color="var(--success-color)" />
              {uploadSuccess}
            </div>
          )}

          {(vehicle.media || []).length === 0 ? (
            <div className="empty-state" style={{ padding: "36px 20px" }}>
              <div className="empty-icon">📷</div>
              <h5>No photos added yet</h5>
              <p>Upload vehicle pictures, receipts, or inspection photos.</p>
              <button
                className="btn-orange"
                style={{ marginTop: 10 }}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload First Photo
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {(vehicle.media || []).map((m) => (
                <div key={m.id} className="garage-card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
                  <img
                    src={m.url}
                    alt={m.name || "Vehicle photo"}
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.name || "Vehicle Photo"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--accent-color)", fontWeight: 700, background: "rgba(255,77,0,0.08)", padding: "2px 6px", borderRadius: 4 }}>
                        {m.savedPercent ? `${m.savedPercent}% saved` : "Optimized"}
                      </span>
                      <button
                        onClick={() => removeVehicleMedia(id, m.id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                        title="Delete photo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FAB ───────────────────────────────── */}
      <Link
        to={`/vehicle/${id}/add-maintenance`}
        className="btn-orange"
        style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          borderRadius: 50,
          padding: "12px 18px",
          boxShadow: "0 4px 20px rgba(255,77,0,0.35)",
          zIndex: 999,
          fontSize: "0.85rem",
        }}
      >
        <Plus size={16} /> Add Service
      </Link>
    </div>
  );
}
