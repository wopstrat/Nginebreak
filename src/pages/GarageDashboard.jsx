import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import VehicleFitnessDial from "../components/VehicleFitnessDial";
import {
  isUserAdmin,
  isRealAdmin,
  getAdminViewMode,
  setAdminViewMode,
  getAdminSettings,
  saveAdminSettings,
} from "../utils/adminAuth";
import {
  Plus,
  Shield,
  Download,
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
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
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

  // Helper to calculate overdue & due soon counts for any vehicle
  const getVehicleStats = (veh) => {
    if (!veh) return { overdue: 0, dueSoon: 0, total: 0 };
    const mods = veh.maintenance_modules || [];
    let overdue = 0;
    let dueSoon = 0;

    mods.forEach((m) => {
      const life = calculatePartLifePercent(m, veh.current_odometer);
      if (life <= 0 || (m.remaining_km !== null && m.remaining_km <= 0)) {
        overdue++;
      } else if (life <= 20 || (m.remaining_km !== null && m.remaining_km <= 300)) {
        dueSoon++;
      }
    });

    return { overdue, dueSoon, total: mods.length };
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  const displayName = user?.name || currentUser?.user_metadata?.display_name || "Enthusiast";
  const firstName = displayName.split(" ")[0] || "Enthusiast";

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
      <div
        className="dashboard-top-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          paddingTop: 6,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            MY GARAGE
          </div>
          <h1
            style={{
              fontSize: "1.48rem",
              fontWeight: 800,
              margin: 0,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Hey, {firstName} 👋
          </h1>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 3 }}>
            Keep your vehicle in the best shape.
          </div>
        </div>

        {/* Desktop search input if on large screen */}
        <div
          className="desktop-search-container"
          style={{ flex: 1, maxWidth: 360, margin: "0 20px", position: "relative" }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Search vehicles, maintenance..."
            style={{ paddingLeft: 36, fontSize: "0.82rem", height: 38, borderRadius: 20 }}
          />
        </div>

        {/* Notification Bell & Profile Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <button
            type="button"
            className="btn-icon"
            style={{
              position: "relative",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
            title="Notifications"
            onClick={() => navigate("/history")}
          >
            <Bell size={19} />
            <span
              style={{
                position: "absolute",
                top: 7,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                border: "2px solid var(--bg-card)",
              }}
            />
          </button>

          <Link to="/profile" style={{ textDecoration: "none" }}>
            <div
              className="avatar"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                overflow: "hidden",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "1rem",
                boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                firstName[0]?.toUpperCase() || "E"
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* ── 1. Profile Header Hero Section (Cover + Avatar + XP) ── */}
      <div
        className="profile-hero-banner"
        style={{
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          minHeight: 160,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          backgroundImage:
            'linear-gradient(to right, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.4) 55%, rgba(15, 23, 42, 0.75) 100%), url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "16px 18px 18px",
          color: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          marginBottom: 22,
        }}
      >
        {/* Edit Cover button */}
        <Link
          to="/profile"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 20,
            padding: "5px 12px",
            color: "#fff",
            fontSize: "0.74rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
          }}
        >
          <Camera size={13} /> Edit Cover
        </Link>

        {/* User details row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            width: "100%",
            marginTop: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2.5px solid #fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                flexShrink: 0,
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>
                  {firstName[0]?.toUpperCase() || "E"}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: "1.18rem",
                  fontWeight: 800,
                  margin: "0 0 2px",
                  color: "#fff",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </h2>
              <div
                style={{
                  fontSize: "0.76rem",
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 500,
                  marginBottom: 6,
                }}
              >
                Level 2 &bull; 320 / 500 XP
              </div>

              {/* Progress bar to next level */}
              <div
                style={{
                  width: 140,
                  maxWidth: "100%",
                  height: 5,
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "64%",
                    height: "100%",
                    background: "var(--accent-color, #f97316)",
                    borderRadius: 10,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Slanted Mottos on right */}
          <div
            style={{
              textAlign: "right",
              fontSize: "0.66rem",
              fontWeight: 800,
              fontStyle: "italic",
              letterSpacing: "0.08em",
              lineHeight: 1.25,
              color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase",
            }}
          >
            <div>DRIVE</div>
            <div>MAINTAIN</div>
            <div>EXPLORE</div>
          </div>
        </div>
      </div>

      {/* ── Admin Switch Banner (when applicable) ── */}
      {isRealAdminUser && adminViewMode === "user" && (
        <div
          style={{
            background: "rgba(249, 115, 22, 0.08)",
            border: "1px solid rgba(249, 115, 22, 0.3)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
            👁️ Viewing as Standard User
          </span>
          <button
            onClick={() => setAdminViewMode("admin")}
            style={{
              background: "var(--accent-color)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Shield size={14} /> Switch to Admin View
          </button>
        </div>
      )}

      {/* ── Admin Command Center (if admin) ── */}
      {isAdmin && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(245,158,11,0.04) 100%)",
            border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Admin Center
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setAdminViewMode("user")}
                style={{
                  background: "#0F172A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Eye size={12} /> User View
              </button>
              <button
                onClick={handleExportBackup}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
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
          {/* Header row: MY VEHICLES + Add Vehicle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: "0.88rem",
                fontWeight: 800,
                margin: 0,
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              MY VEHICLES
            </h2>
            <Link
              to="/add-vehicle"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--accent-color, #f97316)",
                fontSize: "0.84rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Plus size={16} /> Add Vehicle
            </Link>
          </div>

          {/* Vehicle Cards List */}
          {vehicles.length === 0 ? (
            <div
              className="empty-state"
              style={{
                background: "var(--bg-card)",
                borderRadius: 18,
                border: "1px solid var(--border-color)",
                padding: "26px 16px",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: "2.2rem", marginBottom: 8 }}>🚗</div>
              <h5 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", margin: "0 0 6px" }}>
                Your garage is empty
              </h5>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 16px" }}>
                Add your first vehicle to start tracking maintenance and odometer updates.
              </p>
              <Link to="/add-vehicle" className="btn-orange" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={16} /> Add Vehicle
              </Link>
            </div>
          ) : (
            vehicles.map((v) => {
              const stats = getVehicleStats(v);
              const membersCount = (v.members?.length || 0) + 1;

              return (
                <div
                  key={v.id}
                  onClick={() => navigate(`/vehicle/${v.id}`)}
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: 18,
                    padding: "12px 14px",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--card-shadow, 0 2px 10px rgba(0,0,0,0.03))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 12,
                    cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  className="vehicle-dashboard-card"
                >
                  {/* Left: Vehicle Image Thumbnail */}
                  <div
                    style={{
                      width: 76,
                      height: 50,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={
                        v.photo_url ||
                        (v.media && v.media[0]?.url) ||
                        "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=300&q=80"
                      }
                      alt={v.model}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div
                      style={{
                        display: "none",
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(249,115,22,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.4rem",
                      }}
                    >
                      🚗
                    </div>
                  </div>

                  {/* Middle: Name, Year • Type, Shared badge */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        margin: "0 0 2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {v.nickname || `${v.make} ${v.model}`}
                    </h3>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: 4 }}>
                      {v.year} &bull; {v.type || v.fuel_type || "Car"}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "#059669",
                        borderRadius: 12,
                        padding: "2px 8px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                      }}
                    >
                      <Users size={11} />
                      <span>
                        Shared &bull; {membersCount} Member{membersCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Pill + Chevron */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {stats.overdue > 0 ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                          borderRadius: 10,
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                        }}
                      >
                        <AlertTriangle size={14} />
                        <span>{stats.overdue} Overdue</span>
                      </div>
                    ) : stats.dueSoon > 0 ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "rgba(245, 158, 11, 0.1)",
                          color: "#f59e0b",
                          borderRadius: 10,
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                        }}
                      >
                        <AlertCircle size={14} />
                        <span>{stats.dueSoon} Due Soon</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981",
                          borderRadius: 10,
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>All Good</span>
                      </div>
                    )}
                    <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              );
            })
          )}

          {/* ── 2. NEXT MAINTENANCE Section ── */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  margin: 0,
                  color: "var(--text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                NEXT MAINTENANCE
              </h2>
              <Link
                to={activeVehicle ? `/vehicle/${activeVehicle.id}` : "/vehicles"}
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                View All
              </Link>
            </div>

            {/* Maintenance Item Card */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: 18,
                padding: "13px 15px",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--card-shadow, 0 2px 10px rgba(0,0,0,0.03))",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                cursor: "pointer",
              }}
              onClick={() => {
                if (activeVehicle) navigate(`/vehicle/${activeVehicle.id}`);
              }}
            >
              {/* Left: Square Orange Icon Box */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(249, 115, 22, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-color, #f97316)",
                  flexShrink: 0,
                }}
              >
                <Wrench size={22} />
              </div>

              {/* Middle: Service Name & Due km */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.96rem",
                    color: "var(--text-primary)",
                    margin: "0 0 2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {nextMaintenanceMod ? nextMaintenanceMod.name : "All Services Up to Date"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {nextMaintenanceMod?.next_due_km
                    ? `Due at ${nextMaintenanceMod.next_due_km.toLocaleString()} km`
                    : nextMaintenanceMod
                    ? "Scheduled"
                    : "No pending maintenance"}
                </div>
              </div>

              {/* Right: Remaining Distance/Days & Chevron */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "0.96rem",
                      color:
                        nextMaintenanceMod &&
                        nextMaintenanceMod.remaining_km !== null &&
                        nextMaintenanceMod.remaining_km <= 0
                          ? "#ef4444"
                          : "var(--accent-color, #f97316)",
                      lineHeight: 1.2,
                    }}
                  >
                    {nextMaintenanceMod
                      ? nextMaintenanceMod.remaining_km !== null
                        ? `${Math.max(0, nextMaintenanceMod.remaining_km).toLocaleString()} km`
                        : `${nextMaintenanceMod.remaining_days || 0} days`
                      : "0 km"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 1 }}>
                    remaining
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
              </div>
            </div>

            {/* Action Buttons: Solid Orange [Update Odometer] + Card [Add Maintenance] */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 14,
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                onClick={() => handleOpenOdoModal(activeVehicle)}
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 14,
                  padding: "13px 14px",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(249, 115, 22, 0.25)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <Gauge size={18} />
                <span>Update Odometer</span>
              </button>

              <Link
                to={activeVehicle ? `/vehicle/${activeVehicle.id}/add-maintenance` : "/add-vehicle"}
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: "13px 14px",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  textDecoration: "none",
                  boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.03))",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
              >
                <Plus size={18} />
                <span>Add Maintenance</span>
              </Link>
            </div>
          </div>

          {/* ── 3. MORE FEATURES Section (4 Grid Columns) ── */}
          <div className="upcoming-features-section" style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: "0.88rem",
                color: "var(--text-primary)",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              MORE FEATURES
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
              }}
            >
              {/* Community */}
              <div
                className="coming-soon-feature-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 16,
                  padding: "14px 6px 12px",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.02))",
                }}
              >
                <div
                  style={{
                    color: "#5b5fc7",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={24} />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: "var(--text-primary)",
                    marginBottom: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  Community
                </div>
                <span style={{ fontSize: "0.64rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Coming Soon
                </span>
              </div>

              {/* Virtual Garage */}
              <div
                className="coming-soon-feature-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 16,
                  padding: "14px 6px 12px",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.02))",
                }}
              >
                <div
                  style={{
                    color: "#5b5fc7",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Warehouse size={24} />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: "var(--text-primary)",
                    marginBottom: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  Virtual Garage
                </div>
                <span style={{ fontSize: "0.64rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Coming Soon
                </span>
              </div>

              {/* Builds */}
              <div
                className="coming-soon-feature-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 16,
                  padding: "14px 6px 12px",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.02))",
                }}
              >
                <div
                  style={{
                    color: "#5b5fc7",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wrench size={24} />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: "var(--text-primary)",
                    marginBottom: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  Builds
                </div>
                <span style={{ fontSize: "0.64rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Coming Soon
                </span>
              </div>

              {/* Discover */}
              <div
                className="coming-soon-feature-card"
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 16,
                  padding: "14px 6px 12px",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.02))",
                }}
              >
                <div
                  style={{
                    color: "#5b5fc7",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Search size={24} />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: "var(--text-primary)",
                    marginBottom: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  Discover
                </div>
                <span style={{ fontSize: "0.64rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT / SIDEBAR COLUMN (Visible on Desktop ≥1024px) ── */}
        <div className="dashboard-side-col">
          {/* Option 4: Vehicle Fitness Dial */}
          {activeVehicle && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 10,
                }}
              >
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
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 20,
              padding: "18px",
              border: "1px solid var(--border-color)",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 14,
              }}
            >
              Quick Actions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => handleOpenOdoModal(activeVehicle)}
                style={{
                  background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: "12px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Gauge size={18} style={{ color: "var(--accent-color)" }} />
                <span>Update Odometer</span>
              </button>

              <Link
                to={activeVehicle ? `/vehicle/${activeVehicle.id}/add-maintenance` : "/add-vehicle"}
                style={{
                  background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: "12px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Plus size={18} style={{ color: "var(--accent-color)" }} />
                <span>Add Maintenance</span>
              </Link>

              <Link
                to={activeVehicle ? `/odometer-history/${activeVehicle.id}` : "/history"}
                style={{
                  background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: "12px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Clock size={18} style={{ color: "var(--accent-color)" }} />
                <span>View History</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Odometer Update Modal ── */}
      {selectedVehicleForOdo && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedVehicleForOdo(null)}
          style={{ zIndex: 1200 }}
        >
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
