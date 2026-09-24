import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import StorageService from "../services/StorageService";
import notificationService from "../services/NotificationService";
import {
  setAdminViewMode,
  saveAdminSettings,
} from "../utils/adminAuth";
import "./AdminPanel.css";
import {
  Users,
  Car,
  Bell,
  Sliders,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  RefreshCw,
  Eye,
  Wrench,
  Gauge,
  Send,
  Sparkles,
  UserCheck,
  Lock,
  ArrowLeft,
  LayoutGrid,
  FlaskConical,
  Image as ImageIcon,
  User,
  X,
} from "lucide-react";

export default function AdminPanel() {
  const { isRealAdminUser, adminViewMode, refreshData, adminSettings, currentUser } = useGarage();
  const navigate = useNavigate();

  // Active top tab: 'overview' | 'users' | 'garages' | 'maintenance' | 'notifications' | 'system'
  const [activeTab, setActiveTab] = useState("overview");

  // Users State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [userSubTab, setUserSubTab] = useState("garage");

  // Vehicles State
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState("");

  // Modals state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [targetUserIdForVehicle, setTargetUserIdForVehicle] = useState("");

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [targetVehicleIdForModule, setTargetVehicleIdForModule] = useState("");

  const [showOdoModal, setShowOdoModal] = useState(false);
  const [selectedVehForOdo, setSelectedVehForOdo] = useState(null);
  const [newOdoValue, setNewOdoValue] = useState("");

  // Form states
  const [vehFormData, setVehFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    current_odometer: 0,
    notes: "",
    type: "Car",
  });

  const [modFormData, setModFormData] = useState({
    name: "",
    category: "General",
    interval_km: 10000,
    interval_months: 12,
    last_service_km: 0,
    last_service_date: new Date().toISOString().split("T")[0],
  });

  // Notification broadcast state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSentMsg, setNotifSentMsg] = useState("");

  // Settings state
  const [localSettings, setLocalSettings] = useState(adminSettings || {});

  // Load data on mount
  const loadAdminData = async () => {
    setLoadingUsers(true);
    setLoadingVehicles(true);
    try {
      const uList = await StorageService.getAllUsersAdmin();
      setUsers(uList);
      if (uList.length > 0 && !selectedUserId) {
        setSelectedUserId(uList[0].id);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoadingUsers(false);
    }

    try {
      const vList = await StorageService.getAllVehiclesAdmin();
      setVehicles(vList);
    } catch (err) {
      console.error("Error loading vehicles:", err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    if (adminSettings) setLocalSettings(adminSettings);
  }, [adminSettings]);

  const handleSelectUser = (uId) => {
    setSelectedUserId(uId);
    setMobileShowDetail(true);
  };

  // If user is not admin, deny access
  if (!isRealAdminUser) {
    return (
      <div className="admin-page-container" style={{ textAlign: "center" }}>
        <div
          style={{
            maxWidth: 420,
            margin: "40px auto",
            padding: 30,
            background: "#FFF",
            borderRadius: 16,
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <Lock size={48} color="var(--danger-color)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 8 }}>Admin Access Restricted</h2>
          <p style={{ color: "#6B7280", fontSize: "0.88rem", marginBottom: 24 }}>
            You must be logged in with an Administrator account to view the Admin Console.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/")}
            style={{ width: "100%", borderRadius: 10, padding: 12, background: "var(--accent-color)", color: "#FFF", border: "none", fontWeight: 700 }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filtered lists
  const filteredUsers = users.filter(
    (u) =>
      u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const userVehicles = vehicles.filter(
    (v) =>
      v.user_id === selectedUserId ||
      (v.members && v.members.some((m) => m.user_id === selectedUserId || (m.email && selectedUser?.email && m.email.toLowerCase() === selectedUser.email.toLowerCase())))
  );

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.make?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.model?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.name?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.user_id?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // Vehicle CRUD Handlers
  const handleOpenAddVehicle = (userId) => {
    setTargetUserIdForVehicle(userId || selectedUserId || currentUser?.id);
    setEditingVehicle(null);
    setVehFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      current_odometer: 0,
      notes: "",
      type: "Car",
    });
    setShowVehicleModal(true);
  };

  const handleOpenEditVehicle = (veh) => {
    setEditingVehicle(veh);
    setTargetUserIdForVehicle(veh.user_id);
    setVehFormData({
      make: veh.make || "",
      model: veh.model || "",
      year: veh.year || new Date().getFullYear(),
      current_odometer: veh.current_odometer || 0,
      notes: veh.notes || "",
      type: veh.type || "Car",
    });
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!vehFormData.make || !vehFormData.model) {
      alert("Make and Model are required");
      return;
    }

    if (editingVehicle) {
      await StorageService.adminUpdateVehicle(editingVehicle.id, vehFormData);
    } else {
      await StorageService.adminAddVehicle(targetUserIdForVehicle, vehFormData);
    }

    setShowVehicleModal(false);
    await refreshData();
    await loadAdminData();
  };

  const handleDeleteVehicle = async (vehId) => {
    if (window.confirm("Are you sure you want to delete this vehicle and all its data? This action cannot be undone.")) {
      await StorageService.adminDeleteVehicle(vehId);
      await refreshData();
      await loadAdminData();
    }
  };

  // Odometer handler
  const handleSaveOdometer = async (e) => {
    e.preventDefault();
    if (!selectedVehForOdo || !newOdoValue) return;

    await StorageService.updateOdometer(selectedVehForOdo.id, parseInt(newOdoValue));
    setShowOdoModal(false);
    setNewOdoValue("");
    await refreshData();
    await loadAdminData();
  };

  // Maintenance Module Handlers
  const handleOpenAddModule = (vehId) => {
    setTargetVehicleIdForModule(vehId);
    setModFormData({
      name: "",
      category: "General",
      interval_km: 10000,
      interval_months: 12,
      last_service_km: 0,
      last_service_date: new Date().toISOString().split("T")[0],
    });
    setShowModuleModal(true);
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    if (!modFormData.name) return;

    await StorageService.adminAddMaintenanceModule(targetVehicleIdForModule, modFormData);
    setShowModuleModal(false);
    await refreshData();
    await loadAdminData();
  };

  const handleDeleteModule = async (moduleId, vehId) => {
    if (window.confirm("Delete this maintenance module?")) {
      await StorageService.adminDeleteMaintenanceModule(moduleId, vehId);
      await refreshData();
      await loadAdminData();
    }
  };

  // Dispatch Notification Broadcast
  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!notifTitle || !notifBody) return;

    notificationService.sendNotification(notifTitle, {
      body: notifBody,
      tag: "admin-broadcast",
      requireInteraction: true,
    });

    setNotifSentMsg(`Broadcast alert "${notifTitle}" sent successfully!`);
    setNotifTitle("");
    setNotifBody("");
    setTimeout(() => setNotifSentMsg(""), 4000);
  };

  // Settings Toggle Handler
  const handleToggleSetting = (key) => {
    const updated = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(updated);
    saveAdminSettings(updated);
  };

  const currentAdminInitial = (currentUser?.email?.[0] || "A").toUpperCase();

  return (
    <div className="admin-page-container" style={{ backgroundColor: "#F8F9FA", minHeight: "100vh", width: "100%", maxWidth: "100vw", boxSizing: "border-box", padding: "16px 16px 100px 16px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif', color: "#111827" }}>
      {/* ── Top Header Logo Bar ───────────────────────────── */}
      <div className="admin-top-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="admin-logo-title" style={{ fontSize: "1.15rem", fontWeight: 900, letterSpacing: "-0.02em", color: "#000", textTransform: "uppercase", lineHeight: 1.1 }}>
            <span style={{ color: "#FF4D00" }}>N</span>GINEBREAK
          </div>
          <div className="admin-logo-sub" style={{ fontSize: "0.6rem", fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em", marginTop: 3, textTransform: "uppercase" }}>YOUR VEHICLE. YOUR STORY.</div>
        </div>
        <div className="admin-avatar-circle" title="Admin Account" style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEE2D5", color: "#C2410C", fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #FFEDD5", flexShrink: 0 }}>
          {currentAdminInitial}
        </div>
      </div>

      {/* ── Intro Title & Description ────────────────────── */}
      <h1 className="admin-page-title" style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.03em", lineHeight: 1.2 }}>Admin Panel</h1>
      <p className="admin-page-sub" style={{ fontSize: "0.84rem", color: "#6B7280", margin: "0 0 20px 0", lineHeight: 1.4 }}>
        Manage users, garages, maintenance and system settings from one place.
      </p>

      {/* ── 2x2 Stat Cards Grid (Matching Target Design) ──── */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24, width: "100%" }}>
        {/* Stat 1: Registered Users */}
        <div className="admin-stat-card" onClick={() => setActiveTab("users")} style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="admin-stat-icon-box" style={{ width: 38, height: 38, borderRadius: 12, background: "#EFF6FF", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="admin-stat-val" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{users.length}</div>
              <div className="admin-stat-lbl" style={{ fontSize: "0.7rem", color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Registered Users</div>
            </div>
          </div>
          <ChevronRight size={18} color="#9CA3AF" />
        </div>

        {/* Stat 2: Garage Vehicles */}
        <div className="admin-stat-card" onClick={() => setActiveTab("garages")} style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="admin-stat-icon-box" style={{ width: 38, height: 38, borderRadius: 12, background: "#FFF7ED", color: "#FF4D00", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Car size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="admin-stat-val" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{vehicles.length}</div>
              <div className="admin-stat-lbl" style={{ fontSize: "0.7rem", color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Garage Vehicles</div>
            </div>
          </div>
          <ChevronRight size={18} color="#9CA3AF" />
        </div>

        {/* Stat 3: Alert Status */}
        <div className="admin-stat-card" onClick={() => setActiveTab("notifications")} style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="admin-stat-icon-box" style={{ width: 38, height: 38, borderRadius: 12, background: "#ECFDF5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="admin-stat-val" style={{ fontSize: "1rem", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                {typeof window !== "undefined" && window.Notification
                  ? window.Notification.permission.toUpperCase()
                  : "GRANTED"}
              </div>
              <div className="admin-stat-lbl" style={{ fontSize: "0.7rem", color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Alert Status</div>
            </div>
          </div>
          <ChevronRight size={18} color="#9CA3AF" />
        </div>

        {/* Stat 4: Public Beta Mode */}
        <div className="admin-stat-card" onClick={() => setActiveTab("system")} style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="admin-stat-icon-box" style={{ width: 38, height: 38, borderRadius: 12, background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="admin-stat-val" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{localSettings?.betaTestingMode ? "ON" : "OFF"}</div>
              <div className="admin-stat-lbl" style={{ fontSize: "0.7rem", color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Public Beta Mode</div>
            </div>
          </div>
          <ChevronRight size={18} color="#9CA3AF" />
        </div>
      </div>

      {/* ── Navigation Strip (Icons + Text) ───────────────── */}
      <div className="admin-tab-strip" style={{ display: "flex", alignItems: "stretch", borderBottom: "1.5px solid #E5E7EB", marginBottom: 24, paddingBottom: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        <button
          className={`admin-tab-item ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
          style={{ borderBottom: activeTab === "overview" ? "2.5px solid #FF4D00" : "2.5px solid transparent", color: activeTab === "overview" ? "#FF4D00" : "#6B7280", fontWeight: activeTab === "overview" ? 700 : 500 }}
        >
          <LayoutGrid size={16} />
          <span>Overview</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === "users" ? "active" : ""}`}
          onClick={() => { setActiveTab("users"); setMobileShowDetail(false); }}
          style={{ borderBottom: activeTab === "users" ? "2.5px solid #FF4D00" : "2.5px solid transparent", color: activeTab === "users" ? "#FF4D00" : "#6B7280", fontWeight: activeTab === "users" ? 700 : 500 }}
        >
          <Users size={16} />
          <span>Users</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === "garages" ? "active" : ""}`}
          onClick={() => setActiveTab("garages")}
          style={{ borderBottom: activeTab === "garages" ? "2.5px solid #FF4D00" : "2.5px solid transparent", color: activeTab === "garages" ? "#FF4D00" : "#6B7280", fontWeight: activeTab === "garages" ? 700 : 500 }}
        >
          <Car size={16} />
          <span>Garages</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === "maintenance" ? "active" : ""}`}
          onClick={() => setActiveTab("maintenance")}
          style={{ borderBottom: activeTab === "maintenance" ? "2.5px solid #FF4D00" : "2.5px solid transparent", color: activeTab === "maintenance" ? "#FF4D00" : "#6B7280", fontWeight: activeTab === "maintenance" ? 700 : 500 }}
        >
          <Wrench size={16} />
          <span>Service</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
          style={{ borderBottom: activeTab === "notifications" ? "2.5px solid #FF4D00" : "2.5px solid transparent", color: activeTab === "notifications" ? "#FF4D00" : "#6B7280", fontWeight: activeTab === "notifications" ? 700 : 500 }}
        >
          <Bell size={16} />
          <span>Alerts</span>
        </button>

        <button
          className={`admin-tab-item ${activeTab === "system" ? "active" : ""}`}
          onClick={() => setActiveTab("system")}
          style={{ borderBottom: activeTab === "system" ? "2.5px solid #FF4D00" : "2.5px solid transparent", color: activeTab === "system" ? "#FF4D00" : "#6B7280", fontWeight: activeTab === "system" ? 700 : 500 }}
        >
          <Sliders size={16} />
          <span>System</span>
        </button>
      </div>

      {/* ====================================================== */}
      {/* TAB 1: OVERVIEW DASHBOARD (MATCHING TARGET MOCKUP)      */}
      {/* ====================================================== */}
      {activeTab === "overview" && (
        <div>
          {/* Section 1: Recent Registrations */}
          <div className="admin-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="admin-section-title" style={{ fontSize: "1.05rem", fontWeight: 800, color: "#111827", margin: 0 }}>Recent Registrations</h3>
            <span className="admin-section-link" onClick={() => setActiveTab("users")} style={{ fontSize: "0.8rem", color: "#6B7280", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              View All <ChevronRight size={14} />
            </span>
          </div>

          <div className="admin-card-box" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", marginBottom: 24 }}>
            {loadingUsers ? (
              <div style={{ padding: 20, textAlign: "center", color: "#6B7280" }}>Loading recent users...</div>
            ) : users.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#6B7280" }}>No users registered yet.</div>
            ) : (
              users.slice(0, 3).map((u, idx) => (
                <div key={u.id || idx} className="admin-list-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: idx < 2 ? "1px solid #F1F5F9" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#F3F4F6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6B7280",
                        flexShrink: 0,
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0A0A0A" }}>
                        {u.display_name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
                        {u.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Recently"}
                    </span>
                    <span className={idx === 2 ? "badge-pending" : "badge-active"} style={{ background: idx === 2 ? "#FEF3C7" : "#DCFCE7", color: idx === 2 ? "#D97706" : "#15803D", fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: 12 }}>
                      {idx === 2 ? "Pending" : "Active"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Section 2: Feature Controls */}
          <div className="admin-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="admin-section-title" style={{ fontSize: "1.05rem", fontWeight: 800, color: "#111827", margin: 0 }}>Feature Controls</h3>
            <span className="admin-section-link" onClick={() => setActiveTab("system")} style={{ fontSize: "0.8rem", color: "#6B7280", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              Manage <ChevronRight size={14} />
            </span>
          </div>

          <div className="admin-card-box" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", marginBottom: 24 }}>
            {/* Toggle 1: Public Beta */}
            <div className="admin-list-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#ECFDF5",
                    color: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FlaskConical size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0A0A0A" }}>
                    Public Beta Testing Mode
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
                    Enable experimental features for beta users.
                  </div>
                </div>
              </div>

              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={!!localSettings.betaTestingMode}
                  onChange={() => handleToggleSetting("betaTestingMode")}
                />
                <span className="ios-slider"></span>
              </label>
            </div>

            {/* Toggle 2: System Maintenance */}
            <div className="admin-list-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#F3E8FF",
                    color: "#9333EA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Wrench size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0A0A0A" }}>
                    System Maintenance Mode
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
                    Shows maintenance banner to non-admin users.
                  </div>
                </div>
              </div>

              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={!!localSettings.maintenanceMode}
                  onChange={() => handleToggleSetting("maintenanceMode")}
                />
                <span className="ios-slider"></span>
              </label>
            </div>

            {/* Toggle 3: Image Saver */}
            <div className="admin-list-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#EFF6FF",
                    color: "#3B82F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ImageIcon size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0A0A0A" }}>
                    Image Saver Mode
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
                    Compress vehicle photos to ~50KB to save storage.
                  </div>
                </div>
              </div>

              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={localSettings.imageOptimizationMode === "saver"}
                  onChange={() => {
                    const updated = {
                      ...localSettings,
                      imageOptimizationMode: localSettings.imageOptimizationMode === "saver" ? "standard" : "saver",
                    };
                    setLocalSettings(updated);
                    saveAdminSettings(updated);
                  }}
                />
                <span className="ios-slider"></span>
              </label>
            </div>
          </div>

          {/* Section 3: Quick Actions */}
          <div className="admin-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="admin-section-title" style={{ fontSize: "1.05rem", fontWeight: 800, color: "#111827", margin: 0 }}>Quick Actions</h3>
          </div>

          <div className="admin-quick-actions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24, width: "100%" }}>
            <div className="admin-action-btn-card" onClick={() => setActiveTab("users")} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: "14px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", textAlign: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", width: "100%", boxSizing: "border-box" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={18} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1F2937", lineHeight: 1.2, display: "block" }}>Manage Users</span>
            </div>

            <div className="admin-action-btn-card" onClick={() => setActiveTab("garages")} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: "14px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", textAlign: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", width: "100%", boxSizing: "border-box" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FFF7ED", color: "#FF4D00", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Car size={18} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1F2937", lineHeight: 1.2, display: "block" }}>Manage Garages</span>
            </div>

            <div className="admin-action-btn-card" onClick={() => setActiveTab("maintenance")} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: "14px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", textAlign: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", width: "100%", boxSizing: "border-box" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F3E8FF", color: "#9333EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wrench size={18} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1F2937", lineHeight: 1.2, display: "block" }}>Manage Maintenance</span>
            </div>

            <div className="admin-action-btn-card" onClick={() => setActiveTab("notifications")} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: "14px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", textAlign: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", width: "100%", boxSizing: "border-box" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ECFDF5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bell size={18} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1F2937", lineHeight: 1.2, display: "block" }}>Notification Manager</span>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 2: USERS & GARAGES DRILLDOWN                       */}
      {/* ====================================================== */}
      {activeTab === "users" && (
        <div>
          {/* User Search & List Container */}
          {(!mobileShowDetail || typeof window === "undefined" || window.innerWidth >= 768) && (
            <div className="admin-card-box" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 className="admin-section-title">Registered Users ({users.length})</h3>
                <button onClick={loadAdminData} className="btn" style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              <div style={{ position: "relative", marginBottom: 14 }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: "#9CA3AF" }} />
                <input
                  type="text"
                  placeholder="Search by name, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 36px",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                    background: "#F9FAFB",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              {loadingUsers ? (
                <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF" }}>Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: "0.85rem" }}>
                  No users found matching query.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
                  {filteredUsers.map((u) => {
                    const isSelected = u.id === selectedUserId;
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUser(u.id)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: isSelected ? "1.5px solid #FF4D00" : "1px solid #E5E7EB",
                          background: isSelected ? "#FFF7ED" : "#FFFFFF",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0A0A0A" }}>
                            {u.display_name} {u.is_admin && <span style={{ fontSize: "0.62rem", padding: "2px 6px", background: "rgba(255,77,0,0.15)", color: "#FF4D00", borderRadius: 4, marginLeft: 6 }}>ADMIN</span>}
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
                            {u.email}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: "0.72rem", padding: "2px 8px", background: "#F3F4F6", borderRadius: 12, border: "1px solid #E5E7EB", fontWeight: 700 }}>
                            🏎️ {u.vehicles_count || 0}
                          </span>
                          <ChevronRight size={16} color={isSelected ? "#FF4D00" : "#9CA3AF"} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Selected User Details Panel */}
          {selectedUser && (mobileShowDetail || typeof window === "undefined" || window.innerWidth >= 768) && (
            <div className="admin-card-box">
              {mobileShowDetail && (
                <button
                  onClick={() => setMobileShowDetail(false)}
                  style={{
                    background: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={15} /> Back to Users List
                </button>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: 14, marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>{selectedUser.display_name}</h3>
                    {selectedUser.is_admin && <span style={{ fontSize: "0.68rem", padding: "2px 8px", background: "#FF4D00", color: "#FFF", borderRadius: 12, fontWeight: 700 }}>Admin</span>}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: 2 }}>
                    {selectedUser.email} &bull; ID: <code>{selectedUser.id.substring(0, 10)}...</code>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddVehicle(selectedUser.id)}
                  style={{ background: "#FF4D00", color: "#FFF", borderRadius: 8, border: "none", padding: "7px 14px", fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
                >
                  <Plus size={15} /> Add Vehicle
                </button>
              </div>

              {/* Sub tabs for selected user */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                <button
                  onClick={() => setUserSubTab("garage")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    background: userSubTab === "garage" ? "#0A0A0A" : "#F9FAFB",
                    color: userSubTab === "garage" ? "#FFF" : "#6B7280",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  User Garage ({userVehicles.length})
                </button>
                <button
                  onClick={() => setUserSubTab("maintenance")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    background: userSubTab === "maintenance" ? "#0A0A0A" : "#F9FAFB",
                    color: userSubTab === "maintenance" ? "#FFF" : "#6B7280",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Services
                </button>
              </div>

              {/* Sub Tab: Vehicles */}
              {userSubTab === "garage" && (
                <div>
                  {userVehicles.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", border: "1px dashed #E5E7EB", borderRadius: 10 }}>
                      No vehicles in this user's garage.
                      <div style={{ marginTop: 10 }}>
                        <button onClick={() => handleOpenAddVehicle(selectedUser.id)} style={{ fontSize: "0.8rem", padding: "6px 12px", background: "#FF4D00", color: "#FFF", borderRadius: 6, border: "none" }}>
                          Create First Vehicle
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {userVehicles.map((v) => (
                        <div key={v.id} style={{ padding: 12, borderRadius: 10, border: "1px solid #E5E7EB", background: "#F9FAFB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0A0A0A" }}>
                              {v.year} {v.make} {v.model}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "#6B7280", marginTop: 2, display: "flex", gap: 10 }}>
                              <span>🛣️ Odo: <strong>{v.current_odometer?.toLocaleString()} km</strong></span>
                              <span>🔧 Modules: <strong>{v.maintenance_modules?.length || 0}</strong></span>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => {
                                setSelectedVehForOdo(v);
                                setNewOdoValue(v.current_odometer);
                                setShowOdoModal(true);
                              }}
                              style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#FFF", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Gauge size={13} /> Log Odo
                            </button>
                            <button
                              onClick={() => handleOpenEditVehicle(v)}
                              style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#FFF", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(v.id)}
                              style={{ padding: "5px 9px", borderRadius: 6, border: "none", background: "#FEE2E2", color: "#DC2626", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub Tab: Maintenance */}
              {userSubTab === "maintenance" && (
                <div>
                  {userVehicles.map((v) => (
                    <div key={v.id} style={{ marginBottom: 14, border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, background: "#F9FAFB" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>{v.year} {v.make} {v.model}</span>
                        <button onClick={() => handleOpenAddModule(v.id)} style={{ padding: "4px 8px", background: "#FF4D00", color: "#FFF", borderRadius: 6, border: "none", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                          + Add Service
                        </button>
                      </div>
                      {(!v.maintenance_modules || v.maintenance_modules.length === 0) ? (
                        <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>No maintenance modules configured.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {v.maintenance_modules.map((m) => (
                            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#FFF", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: "0.78rem" }}>
                              <div><strong>{m.name}</strong> &bull; Every {m.interval_km?.toLocaleString()} km</div>
                              <button onClick={() => handleDeleteModule(m.id, v.id)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer" }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 3: MASTER VEHICLES DIRECTORY (GARAGES)             */}
      {/* ====================================================== */}
      {activeTab === "garages" && (
        <div className="admin-card-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 className="admin-section-title">Master Vehicle Directory</h3>
              <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>Manage all vehicles across garages.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Search make, model..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: "0.82rem" }}
              />
              <button onClick={() => handleOpenAddVehicle(currentUser?.id)} style={{ padding: "6px 12px", borderRadius: 8, background: "#FF4D00", color: "#FFF", border: "none", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                + Create
              </button>
            </div>
          </div>

          {loadingVehicles ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF" }}>Loading vehicles...</div>
          ) : filteredVehicles.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF" }}>No vehicles found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredVehicles.map((v) => (
                <div key={v.id} style={{ padding: 12, borderRadius: 10, border: "1px solid #E5E7EB", background: "#F9FAFB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0A0A0A" }}>
                      {v.year} {v.make} {v.model}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#6B7280", marginTop: 2 }}>
                      🛣️ Odometer: <strong>{v.current_odometer?.toLocaleString()} km</strong> &bull; Modules: <strong>{v.maintenance_modules?.length || 0}</strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleOpenEditVehicle(v)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#FFF", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => handleDeleteVehicle(v.id)} style={{ padding: "5px 10px", borderRadius: 6, background: "#FEE2E2", color: "#DC2626", border: "none", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 4: MAINTENANCE                                     */}
      {/* ====================================================== */}
      {activeTab === "maintenance" && (
        <div className="admin-card-box">
          <h3 className="admin-section-title" style={{ marginBottom: 12 }}>Global Maintenance Overview</h3>
          <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 16 }}>Inspect and configure service schedules for all registered vehicles.</p>
          {vehicles.map((v) => (
            <div key={v.id} style={{ marginBottom: 14, border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, background: "#F9FAFB" }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: 6 }}>{v.year} {v.make} {v.model}</div>
              {(!v.maintenance_modules || v.maintenance_modules.length === 0) ? (
                <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>No modules configured.</div>
              ) : (
                v.maintenance_modules.map((m) => (
                  <div key={m.id} style={{ fontSize: "0.78rem", padding: "4px 0", color: "#374151" }}>
                    &bull; {m.name} — Every {m.interval_km?.toLocaleString()} km
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 5: NOTIFICATIONS MANAGER                           */}
      {/* ====================================================== */}
      {activeTab === "notifications" && (
        <div>
          <div className="admin-card-box">
            <h3 className="admin-section-title" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Send size={16} color="#FF4D00" /> Broadcast System Alert
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 14 }}>Send instant push alert notification to active users.</p>

            {notifSentMsg && (
              <div style={{ padding: 10, borderRadius: 8, background: "#E6F4EA", color: "#137333", fontSize: "0.82rem", fontWeight: 700, marginBottom: 12 }}>
                {notifSentMsg}
              </div>
            )}

            <form onSubmit={handleSendBroadcast}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Alert Title</label>
                <input
                  type="text"
                  placeholder="e.g. Public Beta Update Released"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: "0.85rem" }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Alert Message</label>
                <textarea
                  rows={3}
                  placeholder="Describe update details..."
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: "0.85rem" }}
                />
              </div>
              <button type="submit" style={{ width: "100%", padding: 10, background: "#FF4D00", color: "#FFF", borderRadius: 8, border: "none", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                📢 Dispatch Notification
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 6: SYSTEM & BETA CONTROLS                          */}
      {/* ====================================================== */}
      {activeTab === "system" && (
        <div className="admin-card-box">
          <h3 className="admin-section-title" style={{ marginBottom: 14 }}>Public Beta & System Controls</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="admin-list-row" style={{ padding: "10px 0" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Public Beta Testing Mode</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Enable experimental feature previews.</div>
              </div>
              <label className="ios-switch">
                <input type="checkbox" checked={!!localSettings.betaTestingMode} onChange={() => handleToggleSetting("betaTestingMode")} />
                <span className="ios-slider"></span>
              </label>
            </div>

            <div className="admin-list-row" style={{ padding: "10px 0" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>System Maintenance Mode</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Show maintenance banner to non-admin users.</div>
              </div>
              <label className="ios-switch">
                <input type="checkbox" checked={!!localSettings.maintenanceMode} onChange={() => handleToggleSetting("maintenanceMode")} />
                <span className="ios-slider"></span>
              </label>
            </div>

            <div className="admin-list-row" style={{ padding: "10px 0" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Image Saver Mode</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Compress vehicle photos to ~50KB.</div>
              </div>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={localSettings.imageOptimizationMode === "saver"}
                  onChange={() => {
                    const updated = { ...localSettings, imageOptimizationMode: localSettings.imageOptimizationMode === "saver" ? "standard" : "saver" };
                    setLocalSettings(updated);
                    saveAdminSettings(updated);
                  }}
                />
                <span className="ios-slider"></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* MODAL: CREATE / EDIT VEHICLE                           */}
      {/* ====================================================== */}
      {showVehicleModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#FFF", borderRadius: 16, padding: 20, width: "100%", maxWidth: 440, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>{editingVehicle ? "Edit Vehicle Specs" : "Add Vehicle to Garage"}</h3>
              <button onClick={() => setShowVehicleModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveVehicle}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Make</label>
                <input type="text" required value={vehFormData.make} onChange={(e) => setVehFormData({ ...vehFormData, make: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Model</label>
                <input type="text" required value={vehFormData.model} onChange={(e) => setVehFormData({ ...vehFormData, model: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Year</label>
                  <input type="number" value={vehFormData.year} onChange={(e) => setVehFormData({ ...vehFormData, year: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Odometer (km)</label>
                  <input type="number" value={vehFormData.current_odometer} onChange={(e) => setVehFormData({ ...vehFormData, current_odometer: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" onClick={() => setShowVehicleModal(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "none" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 8, background: "#FF4D00", color: "#FFF", border: "none", fontWeight: 700 }}>Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* MODAL: UPDATE ODOMETER                                 */}
      {/* ====================================================== */}
      {showOdoModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#FFF", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360, border: "1px solid #E5E7EB" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 12 }}>Update Odometer Log</h3>
            <form onSubmit={handleSaveOdometer}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>New Reading (km)</label>
                <input type="number" required value={newOdoValue} onChange={(e) => setNewOdoValue(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowOdoModal(false)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "none" }}>Cancel</button>
                <button type="submit" style={{ padding: "7px 14px", borderRadius: 8, background: "#FF4D00", color: "#FFF", border: "none", fontWeight: 700 }}>Log Odo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* MODAL: ADD MAINTENANCE MODULE                          */}
      {/* ====================================================== */}
      {showModuleModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#FFF", borderRadius: 16, padding: 20, width: "100%", maxWidth: 400, border: "1px solid #E5E7EB" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 14 }}>Add Maintenance Module</h3>
            <form onSubmit={handleSaveModule}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Service Name</label>
                <input type="text" required value={modFormData.name} onChange={(e) => setModFormData({ ...modFormData, name: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Interval (km)</label>
                  <input type="number" value={modFormData.interval_km} onChange={(e) => setModFormData({ ...modFormData, interval_km: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Interval (Months)</label>
                  <input type="number" value={modFormData.interval_months} onChange={(e) => setModFormData({ ...modFormData, interval_months: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" onClick={() => setShowModuleModal(false)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "none" }}>Cancel</button>
                <button type="submit" style={{ padding: "7px 14px", borderRadius: 8, background: "#FF4D00", color: "#FFF", border: "none", fontWeight: 700 }}>Add Module</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
