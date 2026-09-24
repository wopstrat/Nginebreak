import React, { useState, useRef, useEffect } from 'react';
import { useGarage } from '../context/GarageContext';
import { STATUS } from '../services/CalculationEngine';
import {
  setAdminViewMode,
  getAdminSettings,
  saveAdminSettings,
} from '../utils/adminAuth';
import {
  Pencil,
  Check,
  X,
  Bell,
  BellOff,
  Moon,
  Shield,
  Trash2,
  ChevronRight,
  Car,
  Wrench,
  LogOut,
  AlertTriangle,
  Sliders,
  Database,
  Cpu,
  Key,
  CheckCircle2,
  Zap,
  Eye,
  UserCheck,
  Camera,
  User,
  HelpCircle,
  Users,
  Gauge,
  Sparkles,
} from 'lucide-react';
import UserGuideModal from '../components/UserGuideModal';
import notificationService from '../services/NotificationService';

const LEVELS = [
  { min: 0,   label: 'Driver',     emoji: '🚗' },
  { min: 5,   label: 'Regular',    emoji: '🔧' },
  { min: 15,  label: 'Enthusiast', emoji: '⚡' },
  { min: 30,  label: 'Builder',    emoji: '🔩' },
  { min: 60,  label: 'Veteran',    emoji: '🏁' },
  { min: 100, label: 'Legend',     emoji: '🏆' },
];

function getLevel(n) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (n >= LEVELS[i].min) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

// Mini toggle switch component
function Toggle({ checked, onChange, id }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: 'none' }}
      />
      <div
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: checked ? 'var(--accent-color)' : 'var(--border-color)',
          position: 'relative',
          transition: 'background 0.2s ease',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </label>
  );
}

// A single settings row
function SettingRow({ icon: Icon, label, desc, right, badge }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 0',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: 'var(--bg-page)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--text-secondary)',
        }}
      >
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {label}
          </span>
          {badge && (
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(249, 115, 22, 0.15)',
                color: 'var(--accent-color)',
                textTransform: 'uppercase',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {desc && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {desc}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

export default function Profile() {
  const { vehicles, user, currentUser, logout, updateUserProfile, isRealAdminUser, adminViewMode, adminSettings } = useGarage();

  const [showGuideModal, setShowGuideModal] = useState(false);

  // Derived: is admin currently viewing in admin mode?
  const isAdminView = adminViewMode !== 'user' && isRealAdminUser;

  // Local admin settings state — kept local so toggles feel instant
  const [localAdminSettings, setLocalAdminSettings] = useState(() => getAdminSettings());

  // Keep local settings in sync when context adminSettings update
  useEffect(() => {
    setLocalAdminSettings(adminSettings || getAdminSettings());
  }, [adminSettings]);

  // Profile Picture Upload from Gallery
  const avatarInputRef = useRef(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picSuccess, setPicSuccess] = useState('');

  // Bio Editing State
  const [editBioMode, setEditBioMode] = useState(false);
  const [bioForm, setBioForm] = useState({
    firstName: user?.firstName || (user?.name ? user.name.split(' ')[0] : ''),
    lastName: user?.lastName || (user?.name && user.name.includes(' ') ? user.name.split(' ').slice(1).join(' ') : ''),
    age: user?.age || '',
    gender: user?.gender || 'Prefer not to say',
  });
  const [savingBio, setSavingBio] = useState(false);


  // Sync bioForm when user changes
  useEffect(() => {
    setBioForm({
      firstName: user?.firstName || (user?.name ? user.name.split(' ')[0] : ''),
      lastName: user?.lastName || (user?.name && user.name.includes(' ') ? user.name.split(' ').slice(1).join(' ') : ''),
      age: user?.age || '',
      gender: user?.gender || 'Prefer not to say',
    });
  }, [user]);

  // Push Notifications State & Preferences
  const [notifPermission, setNotifPermission] = useState(() =>
    notificationService.getPermissionState()
  );
  const [notifPrefs, setNotifPrefs] = useState(() =>
    notificationService.getPreferences(currentUser?.id)
  );
  const [notifLoading, setNotifLoading] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);

  useEffect(() => {
    setNotifPermission(notificationService.getPermissionState());
    setNotifPrefs(notificationService.getPreferences(currentUser?.id));
  }, [currentUser]);

  const handleEnableNotifications = async () => {
    setNotifLoading(true);
    try {
      const permission = await notificationService.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        await notificationService.subscribeUser(currentUser?.id, currentUser?.email);
        await notificationService.sendNotification({
          title: '🔧 NGINEBREAK',
          body: 'Notifications Enabled ✓ You will receive vehicle maintenance and garage updates.',
          tag: 'nginebreak-welcome',
        });
      }
    } catch (err) {
      console.warn('Failed to enable notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleToggleNotifPref = async (key, val) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    await notificationService.savePreferences(currentUser?.id, updated);
  };

  const handleSendTestNotification = async () => {
    const sent = await notificationService.sendNotification({
      title: '🔧 NGINEBREAK',
      body: 'Engine Oil is due soon.\nHonda Civic — 300 km remaining.',
      tag: 'test-reminder',
    });
    if (sent) {
      setTestNotifSent(true);
      setTimeout(() => setTestNotifSent(false), 3500);
    }
  };

  // Handle Photo upload from Gallery
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    setPicSuccess('');

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
          await updateUserProfile({ avatar_url: compressedDataUrl });
          setUploadingPic(false);
          setPicSuccess('Profile picture updated!');
          setTimeout(() => setPicSuccess(''), 3000);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to process image:', err);
      setUploadingPic(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (window.confirm('Remove profile picture and use initials?')) {
      await updateUserProfile({ avatar_url: null });
    }
  };

  const handleSaveBio = async (e) => {
    e.preventDefault();
    setSavingBio(true);
    const fn = bioForm.firstName.trim();
    const ln = bioForm.lastName.trim();
    const fullName = `${fn} ${ln}`.trim() || 'Driver';

    await updateUserProfile({
      firstName: fn,
      lastName: ln,
      age: bioForm.age ? parseInt(bioForm.age) : '',
      gender: bioForm.gender,
      name: fullName,
    });
    setSavingBio(false);
    setEditBioMode(false);
  };

  // Handler to update an admin setting
  const updateSetting = (key, val) => {
    const updated = saveAdminSettings({ [key]: val });
    setAdminSettings(updated);
  };

  // 1-Click Toggle for Admin View
  const handleToggleViewMode = () => {
    const nextMode = adminViewMode === 'admin' ? 'user' : 'admin';
    setAdminViewMode(nextMode);
  };

  // Exit Admin Mode completely (deactivate all admin privileges)
  const handleDeactivateAdmin = () => {
    deactivateAdminMode();
    setIsRealAdminUser(false);
    setIsAdminView(false);
    setAdminViewModeState('user');
  };

  // Stats
  const totalVehicles = vehicles.length;
  const totalModules  = vehicles.reduce((a, v) => a + (v.maintenance_modules?.length || 0), 0);
  const totalRecords  = vehicles.reduce((a, v) => a + (v.service_history?.length || 0), 0);
  const totalOverdue  = vehicles.reduce(
    (a, v) => a + (v.maintenance_modules?.filter(m => m.status === STATUS.OVERDUE).length || 0),
    0
  );

  const level     = getLevel(totalRecords);
  const nextLevel = LEVELS[Math.min(level.index + 1, LEVELS.length - 1)];
  const progress  = nextLevel.min > 0 ? Math.min((totalRecords / nextLevel.min) * 100, 100) : 100;

  // Derived name and initials — always prefer the real user name/avatar
  const displayName = user?.name || currentUser?.user_metadata?.display_name || (isRealAdminUser && isAdminView ? 'System Admin' : 'Enthusiast');
  const initials = displayName?.[0]?.toUpperCase() || 'G';


  return (
    <div className="app-container" style={{ paddingTop: 0 }}>

      {/* Hidden file input for Profile Picture */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />

      {/* ── Page header ───────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 className="page-title">{isRealAdminUser && isAdminView ? 'Admin Profile' : 'Profile'}</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {isRealAdminUser && isAdminView ? 'System Administration & Global Controls' : 'Personal garage & driver stats'}
          </p>
        </div>
        {isRealAdminUser && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))',
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              letterSpacing: '0.04em',
            }}
          >
            <Shield size={12} /> {isAdminView ? 'ADMIN VIEW' : 'PREVIEW MODE'}
          </span>
        )}
      </div>

      {/* ── ADMIN 1-CLICK SWITCH BUTTON (Admin Exclusive) ── */}
      {isRealAdminUser && (
        <div
          className="garage-card"
          style={{
            padding: '12px 16px',
            marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(245,158,11,0.03) 100%)',
            border: '1px solid rgba(249,115,22,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} color="var(--accent-color)" />
              <span>Admin Role View</span>
              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: adminViewMode === 'admin' ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.15)', color: adminViewMode === 'admin' ? 'var(--accent-color)' : '#2563EB', fontWeight: 700 }}>
                {adminViewMode === 'admin' ? 'Admin Active' : 'User Preview'}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {adminViewMode === 'admin' ? 'Currently viewing full admin controls.' : 'Currently previewing standard driver UI.'}
            </div>
          </div>

          <button
            onClick={handleToggleViewMode}
            style={{
              background: adminViewMode === 'admin' ? '#0F172A' : 'var(--accent-color)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {adminViewMode === 'admin' ? <Eye size={13} /> : <Shield size={13} />}
            {adminViewMode === 'admin' ? 'Switch to User View' : 'Switch to Admin View'}
          </button>
        </div>
      )}

      {/* ── Profile card with Gallery Avatar & Bio Data ── */}
      <div
        className="garage-card"
        style={{
          padding: '20px 18px',
          marginBottom: 12,
          border: isRealAdminUser && isAdminView ? '1px solid rgba(249,115,22,0.35)' : '1px solid var(--border-color)',
          background: isRealAdminUser && isAdminView ? 'linear-gradient(180deg, rgba(249,115,22,0.03) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
        }}
      >
        {/* Avatar & Basic Identity Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {/* Avatar circle with Gallery Photo or Initials */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: isRealAdminUser && isAdminView
                  ? 'linear-gradient(135deg, #FF4D00, #F59E0B)'
                  : 'linear-gradient(135deg, #FF4D00, #FF8A50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(255,77,0,0.25)',
                overflow: 'hidden',
                border: '2px solid #FFFFFF',
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>

            {/* Quick Gallery Camera Button */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              title="Upload photo from gallery"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'var(--accent-color)',
                border: '2px solid #FFFFFF',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <Camera size={13} />
            </button>
          </div>

          {/* Name & Role Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {isRealAdminUser && isAdminView ? (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--accent-color)',
                    background: 'rgba(249,115,22,0.12)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  🛡️ System Administrator
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {level.emoji} {level.label}
                </span>
              )}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {currentUser?.email || 'Local Driver'}
              </span>
            </div>

            {/* Photo Action Links */}
            <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingPic}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Camera size={11} />
                {uploadingPic ? 'Optimizing...' : (user?.avatar_url ? 'Change Photo' : 'Add Photo from Gallery')}
              </button>
              {user?.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Remove
                </button>
              )}
              {picSuccess && (
                <span style={{ fontSize: '0.7rem', color: 'var(--success-color)', fontWeight: 600 }}>
                  ✓ {picSuccess}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Minimal Bio Data & Editing Section ── */}
        <div
          style={{
            background: 'var(--bg-page)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Driver Details
            </span>
            {!editBioMode && (
              <button
                onClick={() => setEditBioMode(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                }}
              >
                <Pencil size={12} /> Edit Profile
              </button>
            )}
          </div>

          {!editBioMode ? (
            /* Bio Details Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>First Name</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.firstName || (user?.name ? user.name.split(' ')[0] : '—')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Last Name</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.lastName || (user?.name && user.name.includes(' ') ? user.name.split(' ').slice(1).join(' ') : '—')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Age</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.age ? `${user.age} yrs` : 'Not specified'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Gender</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.gender || 'Not specified'}
                </div>
              </div>
            </div>
          ) : (
            /* Bio Edit Form */
            <form onSubmit={handleSaveBio} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="First name"
                    value={bioForm.firstName}
                    onChange={(e) => setBioForm({ ...bioForm, firstName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={bioForm.lastName}
                    onChange={(e) => setBioForm({ ...bioForm, lastName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 28"
                    value={bioForm.age}
                    onChange={(e) => setBioForm({ ...bioForm, age: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                    Gender
                  </label>
                  <select
                    value={bioForm.gender}
                    onChange={(e) => setBioForm({ ...bioForm, gender: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditBioMode(false)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBio}
                  className="btn-orange"
                  style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                >
                  {savingBio ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Level progress */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {totalRecords} / {nextLevel.min} services
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
              }}
            >
              Next: {nextLevel.label} {nextLevel.emoji}
            </span>
          </div>
          <div
            style={{
              height: 5,
              background: 'var(--bg-page)',
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #FF4D00, #FF8A50)',
                borderRadius: 4,
                width: `${progress}%`,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Stats strip — responsive grid ─────────────────── */}
      <div
        className="garage-card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
          padding: '14px 6px',
          marginBottom: 12,
          gap: 4,
        }}
      >
        {[
          { label: 'Vehicles',  value: totalVehicles, icon: Car,           color: 'var(--accent-color)' },
          { label: 'Schedules', value: totalModules,  icon: Wrench,        color: 'var(--info-color)' },
          { label: 'Services',  value: totalRecords,  icon: Check,         color: 'var(--success-color)' },
          { label: 'Overdue',   value: totalOverdue,  icon: AlertTriangle, color: totalOverdue > 0 ? 'var(--danger-color)' : 'var(--text-muted)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '0 4px',
            }}
          >
            <Icon size={16} style={{ color }} />
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {value}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── USER NOTIFICATIONS SECTION ────────────────────── */}
      <div
        className="garage-card"
        style={{
          padding: '16px 18px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: notifPermission === 'granted' ? 6 : 10,
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Bell size={13} color="var(--accent-color)" />
            Notifications
          </div>

          {notifPermission === 'granted' && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--success-color, #10B981)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Notifications Enabled ✓
            </span>
          )}
        </div>

        {notifPermission === 'unsupported' ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 0' }}>
            Notifications are not available on this browser.
          </div>
        ) : notifPermission === 'denied' ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--danger-color, #EF4444)', padding: '4px 0', lineHeight: 1.45 }}>
            Notifications are blocked. You can enable them from your browser/device settings.
          </div>
        ) : notifPermission !== 'granted' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '6px 0',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1, minWidth: 200 }}>
              Receive maintenance due reminders and shared garage activity alerts.
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={notifLoading}
              style={{
                background: 'var(--accent-color)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: notifLoading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(255, 77, 0, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Bell size={13} />
              {notifLoading ? 'Enabling...' : 'Enable Notifications'}
            </button>
          </div>
        ) : (
          <div>
            <SettingRow
              icon={Wrench}
              label="Maintenance Reminders"
              desc="Alerts when vehicle service is due or approaching"
              right={
                <Toggle
                  id="notif-pref-maintenance"
                  checked={notifPrefs.maintenanceReminders}
                  onChange={(e) => handleToggleNotifPref('maintenanceReminders', e.target.checked)}
                />
              }
            />
            <SettingRow
              icon={Users}
              label="Shared Garage Updates"
              desc="Alerts when co-owners perform maintenance on your vehicle"
              right={
                <Toggle
                  id="notif-pref-shared"
                  checked={notifPrefs.sharedGarageUpdates}
                  onChange={(e) => handleToggleNotifPref('sharedGarageUpdates', e.target.checked)}
                />
              }
            />
            <SettingRow
              icon={Gauge}
              label="Odometer Updates"
              desc="Alerts when vehicle odometer is updated"
              right={
                <Toggle
                  id="notif-pref-odometer"
                  checked={notifPrefs.odometerUpdates}
                  onChange={(e) => handleToggleNotifPref('odometerUpdates', e.target.checked)}
                />
              }
            />
          </div>
        )}
      </div>

      {/* ── ADMIN-ONLY SWITCHING OPTIONS ──────────────────── */}
      {isAdminView ? (
        <div
          className="garage-card"
          style={{
            padding: '16px 18px',
            marginBottom: 12,
            border: '1px solid rgba(249,115,22,0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--accent-color)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sliders size={13} />
              Admin Switching Options (Exclusive)
            </div>
            <span
              style={{
                fontSize: '0.62rem',
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(249,115,22,0.1)',
                color: 'var(--accent-color)',
                fontWeight: 600,
              }}
            >
              SUPERUSER ONLY
            </span>
          </div>

          {/* 1. Image Optimizer Mode Switch */}
          <SettingRow
            icon={Zap}
            label="Image Optimizer: 1MP Ultra-Saver"
            badge={adminSettings.imageOptimizationMode === 'saver' ? '1MP Active' : '1920px Full HD'}
            desc={
              adminSettings.imageOptimizationMode === 'saver'
                ? 'Compresses photos to ~1MP (~50KB-80KB WebP) to save Supabase free tier storage'
                : 'Compresses photos to 1920px Full HD (~100KB-160KB WebP)'
            }
            right={
              <Toggle
                id="toggle-image-saver"
                checked={adminSettings.imageOptimizationMode === 'saver'}
                onChange={e =>
                  updateSetting('imageOptimizationMode', e.target.checked ? 'saver' : 'standard')
                }
              />
            }
          />

          {/* 2. Service Reminders Switch */}
          <SettingRow
            icon={Bell}
            label="Service Reminders"
            desc="Global background reminder notifications"
            right={
              <Toggle
                id="notif-service"
                checked={adminSettings.notifService}
                onChange={e => updateSetting('notifService', e.target.checked)}
              />
            }
          />

          {/* 3. Overdue Alerts Switch */}
          <SettingRow
            icon={AlertTriangle}
            label="Overdue Alerts"
            desc="Broadcast urgent alerts when service is overdue"
            right={
              <Toggle
                id="notif-overdue"
                checked={adminSettings.notifOverdue}
                onChange={e => updateSetting('notifOverdue', e.target.checked)}
              />
            }
          />

          {/* 4. App Updates Switch */}
          <SettingRow
            icon={BellOff}
            label="App Updates & Broadcasts"
            desc="Notify garage members about new app versions"
            right={
              <Toggle
                id="notif-updates"
                checked={adminSettings.notifUpdates}
                onChange={e => updateSetting('notifUpdates', e.target.checked)}
              />
            }
          />

          {/* 5. Dark Mode Switch */}
          <SettingRow
            icon={Moon}
            label="Dark Mode"
            desc="Toggle UI theme mode preference"
            right={
              <Toggle
                id="dark-mode"
                checked={adminSettings.darkMode}
                onChange={e => updateSetting('darkMode', e.target.checked)}
              />
            }
          />

          {/* 6. System Maintenance Mode Switch */}
          <SettingRow
            icon={Database}
            label="Maintenance / Read-Only Mode"
            badge={adminSettings.maintenanceMode ? 'ACTIVE' : null}
            desc="Lock vehicle edits during database migrations"
            right={
              <Toggle
                id="system-maintenance"
                checked={adminSettings.maintenanceMode}
                onChange={e => updateSetting('maintenanceMode', e.target.checked)}
              />
            }
          />

          {/* 7. Beta & Staging Feature Flag Switch */}
          <SettingRow
            icon={Cpu}
            label="Beta & Staging Feature Flag"
            badge={adminSettings.betaTestingMode ? 'BETA ACTIVE' : null}
            desc="Unlock experimental features for Admin & internal testers"
            right={
              <Toggle
                id="beta-testing"
                checked={adminSettings.betaTestingMode}
                onChange={e => updateSetting('betaTestingMode', e.target.checked)}
              />
            }
          />

          {/* 8. Superuser Push Notification Test Broadcast */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: '1px solid var(--border-color)',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-color)',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={15} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Push Notification Test Broadcast
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Send a sample vehicle maintenance alert to test device notifications
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={handleSendTestNotification}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Test Alert
              </button>
              {testNotifSent && (
                <span style={{ fontSize: '0.7rem', color: 'var(--success-color, #10B981)', fontWeight: 600 }}>
                  Sent!
                </span>
              )}
            </div>
          </div>

          {/* Deactivate Admin Mode button */}
          <div style={{ paddingTop: 14, textAlign: 'right' }}>
            <button
              onClick={handleDeactivateAdmin}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Exit Admin Mode
            </button>
          </div>
        </div>
      ) : (
        /* Regular User View: Switching options are hidden! */
        <div
          className="garage-card"
          style={{
            padding: '14px 18px',
            marginBottom: 12,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={18} color="var(--text-muted)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                System Settings Managed by Admin
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                System-wide switches and storage rules are configured by the project administrator.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Help Section ─────────────────────────────────── */}
      <div className="garage-card" style={{ padding: '14px 18px', marginBottom: 12 }}>
        {/* Section label */}
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}>
          Help
        </div>

        <button
          id="profile-help-nginebreak-works"
          onClick={() => setShowGuideModal(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'var(--bg-page)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'var(--text-secondary)',
          }}>
            <HelpCircle size={15} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              How NGINEBREAK Works
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Quick guide to core features
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </button>
      </div>

      {/* ── Sign Out Zone ───────────────────────────────── */}
      <div className="garage-card" style={{ padding: '14px 18px', marginBottom: 24 }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-color)',
            }}
          >
            <LogOut size={15} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)' }}>
            Sign Out
          </span>
        </button>
      </div>

      {/* Tiny version tag */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          NGINEBREAK · {isAdminView ? 'ADMIN CONSOLE ACTIVE' : 'MVP v0.1.0'}
        </span>
      </div>

      {/* ── User Guide Modal (How NGINEBREAK Works) ───────── */}
      {showGuideModal && (
        <UserGuideModal
          mode="guide"
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </div>
  );
}
