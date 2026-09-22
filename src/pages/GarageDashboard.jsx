import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import SwipeableVehicleCard from "../components/SwipeableVehicleCard";
import VehicleFitnessDial from "../components/VehicleFitnessDial";
import {
  isUserAdmin,
  isRealAdmin,
  getAdminViewMode,
  setAdminViewMode,
  getAdminSettings,
  saveAdminSettings,
} from "../utils/adminAuth";
import { isSupabaseConfigured } from "../services/supabaseClient";
import {
  Plus,
  LogOut,
  Shield,
  Zap,
  Download,
  Sliders,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  Bell,
  Camera,
  Gauge,
  Wrench,
  Clock,
  ChevronRight,
  Search,
  Users,
  Warehouse,
  Hammer,
  Compass,
  Sparkles
} from "lucide-react";
import { calculatePartLifePercent } from "../services/CalculationEngine";
import UserGuideModal from "../components/UserGuideModal";

export default function GarageDashboard() {
  const {
    vehicles,
    user,
    currentUser,
    loading,
    logout,
    updateOdometer,
    isOnboardingCompleted,
    setOnboardingCompleted,
  } = useGarage();
  const navigate = useNavigate();

  const [isRealAdminUser, setIsRealAdminUser] = useState(() => isRealAdmin(currentUser));
  const [isAdmin, setIsAdmin] = useState(() => isUserAdmin(currentUser));
  const [adminViewMode, setAdminViewModeState] = useState(() => getAdminViewMode());
  const [adminSettings, setAdminSettings] = useState(() => getAdminSettings());
  const [backupExported, setBackupExported] = useState(false);

  // First-time Onboarding state
  const userEmail = currentUser?.email || user?.email;
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useEffect(() => {
    if (userEmail && isOnboardingCompleted && !isOnboardingCompleted(userEmail)) {
      setShowOnboardingModal(true);
    }
  }, [userEmail, isOnboardingCompleted]);

  const handleFinishOnboarding = () => {
    if (userEmail && setOnboardingCompleted) {
      setOnboardingCompleted(userEmail, true);
    }
    setShowOnboardingModal(false);
  };

  // Odometer modal state
  const [selectedVehicleForOdo, setSelectedVehicleForOdo] = useState(null);
  const [modalOdoValue, setModalOdoValue] = useState("");
  const [odoSaving, setOdoSaving] = useState(false);

  useEffect(() => {
    setIsRealAdminUser(isRealAdmin(currentUser));
    setIsAdmin(isUserAdmin(currentUser));
    setAdminViewModeState(getAdminViewMode());

    const handleSync = () => {
      setIsRealAdminUser(isRealAdmin(currentUser));
      setIsAdmin(isUserAdmin(currentUser));
      setAdminViewModeState(getAdminViewMode());
      setAdminSettings(getAdminSettings());
    };
    window.addEventListener("admin_state_changed", handleSync);
    window.addEventListener("admin_settings_changed", handleSync);
    return () => {
      window.removeEventListener("admin_state_changed", handleSync);
      window.removeEventListener("admin_settings_changed", handleSync);
    };
  }, [currentUser]);

  const activeVehicle = vehicles[0] || null;

  const sharedVehiclesCount = (vehicles || []).filter(
    (v) => v.user_id && currentUser?.id && v.user_id !== currentUser.id
  ).length;

  const toggleImageSaver = () => {
    const next = adminSettings.imageOptimizationMode === "saver" ? "standard" : "saver";
    const updated = saveAdminSettings({ imageOptimizationMode: next });
    setAdminSettings(updated);
  };

  const handleExportBackup = () => {
    const payload = {
      project: "Nginebreak Garage Fleet Backup",
      exported_at: new Date().toISOString(),
      fleet_count: vehicles.length,
      vehicles,
      admin_settings: adminSettings,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nginebreak_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setBackupExported(true);
    setTimeout(() => setBackupExported(false), 3000);
  };

  const handleOpenOdoModal = (vehicle) => {
    const target = vehicle || activeVehicle;
    if (!target) return;
    setSelectedVehicleForOdo(target);
    setModalOdoValue(target.current_odometer || "");
  };

  const handleSaveModalOdo = async (e) => {
    e.preventDefault();
    if (!selectedVehicleForOdo) return;
    const val = parseInt(modalOdoValue);
    if (!val || val <= selectedVehicleForOdo.current_odometer) {
      alert("New odometer reading must be greater than current reading.");
      return;
    }
    setOdoSaving(true);
    try {
      await updateOdometer(selectedVehicleForOdo.id, val);
      setSelectedVehicleForOdo(null);
    } catch (err) {
      alert(err.message || "Failed to update odometer.");
    } finally {
      setOdoSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  const isSaver = adminSettings.imageOptimizationMode === "saver";
  const displayName = user?.name || currentUser?.user_metadata?.display_name || "Akhil Joseph";
  const firstName = displayName.split(" ")[0] || "Akhil";

  // Find next maintenance modules across active vehicle
  const activeMods = activeVehicle?.maintenance_modules || [];
  const sortedActiveMods = [...activeMods].sort((a, b) => {
    const lifeA = calculatePartLifePercent(a, activeVehicle?.current_odometer);
    const lifeB = calculatePartLifePercent(b, activeVehicle?.current_odometer);
    return lifeA - lifeB;
  });
  const nextMaintenanceMod = sortedActiveMods[0] || null;

  return (
    <div className="app-container dashboard-page" style={{ paddingTop: 0, paddingBottom: 40 }}>
      {/* ── Top Header Bar ─────────────────────────────── */}
      <div className="dashboard-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            MY GARAGE
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Hey, {firstName} 👋
          </h1>
        </div>

        {/* Desktop search input if on large screen */}
        <div className="desktop-search-container" style={{ flex: 1, maxWidth: 360, margin: '0 20px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search vehicles, maintenance..."
            style={{ paddingLeft: 36, fontSize: '0.82rem', height: 38, borderRadius: 20 }}
          />
        </div>

        {/* Notification Bell & Profile Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="btn-icon"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
            title="Notifications"
          >
            <Bell size={18} />
          </button>

          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <div
              className="avatar"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                overflow: "hidden",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--accent-color)",
                background: "rgba(249,115,22,0.1)",
                color: "var(--accent-color)",
                fontWeight: 700,
                fontSize: "0.9rem"
              }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                firstName[0]?.toUpperCase() || "A"
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* ── 1. Profile Header Hero Section (Cover + Avatar + XP) ── */}
      <div className="profile-hero-banner" style={{
        position: 'relative',
        borderRadius: 22,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        backgroundImage: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.85)), url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '24px 20px 20px',
        color: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        marginBottom: 22
      }}>
        {/* Edit Cover button */}
        <Link
          to="/profile"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 18,
            padding: '5px 12px',
            color: '#fff',
            fontSize: '0.74rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none'
          }}
        >
          <Camera size={13} /> Edit Cover
        </Link>

        {/* User details row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2.5px solid #fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{firstName[0]}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 2px', color: '#fff', letterSpacing: '-0.01em' }}>
              {displayName}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
              Enthusiast &bull; Level 2
            </div>

            {/* Simple progress bar to next level */}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: '64%', height: '100%', background: 'var(--accent-color, #f97316)', borderRadius: 10 }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                320 / 500 XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin Switch Banner (when applicable) ── */}
      {isRealAdminUser && adminViewMode === "user" && (
        <div style={{ background: "rgba(249, 115, 22, 0.08)", border: "1px solid rgba(249, 115, 22, 0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>👁️ Viewing as Standard User</span>
          <button onClick={() => setAdminViewMode("admin")} style={{ background: "var(--accent-color)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={14} /> Switch to Admin View
          </button>
        </div>
      )}

      {/* ── Admin Command Center (if admin) ── */}
      {isAdmin && (
        <div style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(245,158,11,0.04) 100%)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>Admin Center</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAdminViewMode("user")} style={{ background: "#0F172A", color: "#FFFFFF", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                <Eye size={12} /> User View
              </button>
              <button onClick={handleExportBackup} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                <Download size={12} /> {backupExported ? "Exported!" : "JSON Backup"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dual-Column Dashboard Grid Layout ── */}
      <div className="dashboard-grid-layout">
        {/* ── LEFT / MAIN COLUMN ─────────────────── */}
        <div className="dashboard-main-col">
          {/* Header row: SHARED GARAGE + Add Vehicle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: "0.88rem", fontWeight: 800, margin: 0, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Shared Garage
            </h2>
            <Link
              to="/add-vehicle"
              style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-color)", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}
            >
              <Plus size={15} /> Add Vehicle
            </Link>
          </div>

          {/* Vehicle Cards List */}
          {vehicles.length === 0 ? (
            <div className="empty-state" style={{ marginBottom: 20 }}>
              <div className="empty-icon">🚗</div>
              <h5>Your garage is empty</h5>
              <p>Add your first vehicle to start tracking maintenance and odometer updates.</p>
              <Link to="/add-vehicle" className="btn-orange">
                <Plus size={16} /> Add Vehicle
              </Link>
            </div>
          ) : (
            vehicles.map((v) => (
              <SwipeableVehicleCard
                key={v.id}
                vehicle={v}
                onOpenOdoModal={handleOpenOdoModal}
              />
            ))
          )}

          {/* ── 3. Maintenance Preview (Minimal) ── */}
          {activeVehicle && (
            <div className="minimal-maintenance-section" style={{
              background: 'var(--bg-card)',
              borderRadius: 20,
              padding: '18px 18px 14px',
              border: '1px solid var(--border-color)',
              marginBottom: 20,
              boxShadow: 'var(--card-shadow, 0 4px 20px rgba(0,0,0,0.04))'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Next Maintenance
                </span>
                <Link
                  to={`/vehicle/${activeVehicle.id}`}
                  style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-color)', textDecoration: 'none' }}
                >
                  View All &gt;
                </Link>
              </div>

              {nextMaintenanceMod ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                  borderRadius: 14,
                  border: '1px solid var(--border-color)',
                  marginBottom: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      🔧
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {nextMaintenanceMod.name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {nextMaintenanceMod.next_due_km ? `Due at ${nextMaintenanceMod.next_due_km.toLocaleString()} km` : 'Scheduled'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-color)' }}>
                      {nextMaintenanceMod.remaining_km !== null
                        ? `${nextMaintenanceMod.remaining_km.toLocaleString()} km`
                        : `${nextMaintenanceMod.remaining_days} days`}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      remaining
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  No maintenance items added yet.
                </div>
              )}

              {/* Action Buttons: Update Odometer (Solid Orange) + Add Maintenance (Outline) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <button
                  type="button"
                  className="btn-orange"
                  onClick={() => handleOpenOdoModal(activeVehicle)}
                  style={{ justifyContent: 'center', fontSize: '0.84rem', padding: '11px 12px', borderRadius: 12 }}
                >
                  <Gauge size={15} /> Update Odometer
                </button>

                <Link
                  to={`/vehicle/${activeVehicle.id}/add-maintenance`}
                  className="btn-secondary"
                  style={{
                    justifyContent: 'center',
                    fontSize: '0.84rem',
                    padding: '11px 12px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Plus size={15} /> Add Maintenance
                </Link>
              </div>

              {/* View Odometer History Link */}
              <Link
                to={`/odometer-history/${activeVehicle.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                  <span>View Odometer History</span>
                </div>
                <ChevronRight size={15} />
              </Link>
            </div>
          )}

          {/* ── 4. Upcoming Features (Disabled / Coming Soon 2x2 Grid) ── */}
          <div className="upcoming-features-section" style={{ marginTop: 24 }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
              More Features
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="coming-soon-feature-card" style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: '14px 16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: 0.85
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info-color)' }}>
                  <Users size={19} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>Community</div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>COMING SOON</span>
                </div>
              </div>

              <div className="coming-soon-feature-card" style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: '14px 16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: 0.85
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-color)' }}>
                  <Warehouse size={19} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>Virtual Garage</div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>COMING SOON</span>
                </div>
              </div>

              <div className="coming-soon-feature-card" style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: '14px 16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: 0.85
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning-color)' }}>
                  <Hammer size={19} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>Builds</div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>COMING SOON</span>
                </div>
              </div>

              <div className="coming-soon-feature-card" style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: '14px 16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: 0.85
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                  <Compass size={19} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>Discover</div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>COMING SOON</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT / SIDEBAR COLUMN (Visible on Desktop / Large screens) ── */}
        <div className="dashboard-side-col">
          {/* Option 4: Vehicle Fitness Dial */}
          {activeVehicle && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Vehicle Health &amp; Stats
              </div>
              <VehicleFitnessDial
                vehicle={activeVehicle}
                onOpenOdoModal={() => handleOpenOdoModal(activeVehicle)}
                onViewDetails={() => navigate(`/vehicle/${activeVehicle.id}`)}
              />
            </div>
          )}

          {/* Quick Actions Card */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            padding: '18px',
            border: '1px solid var(--border-color)',
            marginBottom: 20
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => handleOpenOdoModal(activeVehicle)}
                style={{
                  background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Gauge size={18} style={{ color: 'var(--accent-color)' }} />
                <span>Update Odometer</span>
              </button>

              <Link
                to={activeVehicle ? `/vehicle/${activeVehicle.id}/add-maintenance` : '/add-vehicle'}
                style={{
                  background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <Plus size={18} style={{ color: 'var(--accent-color)' }} />
                <span>Add Maintenance</span>
              </Link>

              <Link
                to={activeVehicle ? `/odometer-history/${activeVehicle.id}` : '/history'}
                style={{
                  background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  padding: '12px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <Clock size={18} style={{ color: 'var(--accent-color)' }} />
                <span>View History</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Odometer Update Modal ── */}
      {selectedVehicleForOdo && (
        <div className="modal-backdrop" onClick={() => setSelectedVehicleForOdo(null)} style={{ zIndex: 1200 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 className="modal-title">Update Odometer</h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 16px" }}>
              Update reading for <strong>{selectedVehicleForOdo.make} {selectedVehicleForOdo.model}</strong>. Current: {selectedVehicleForOdo.current_odometer?.toLocaleString()} km.
            </p>

            <form onSubmit={handleSaveModalOdo}>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                  New Odometer (km)
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder={`Greater than ${selectedVehicleForOdo.current_odometer}`}
                  value={modalOdoValue}
                  onChange={(e) => setModalOdoValue(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={odoSaving}
                  className="btn-orange"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {odoSaving ? "Saving…" : "Update Reading"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setSelectedVehicleForOdo(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* First-time Onboarding Modal */}
      {showOnboardingModal && (
        <UserGuideModal
          mode="onboarding"
          onClose={handleFinishOnboarding}
          onComplete={handleFinishOnboarding}
        />
      )}
    </div>
  );
}
