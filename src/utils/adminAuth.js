/**
 * Admin Role & System Settings Management for Nginebreak
 */

const STORAGE_KEY_ADMIN_MODE = "nginebreak_admin_mode";
const STORAGE_KEY_ADMIN_SETTINGS = "nginebreak_admin_settings";
const STORAGE_KEY_ADMIN_VIEW_MODE = "nginebreak_admin_view_mode"; // 'admin' | 'user'

// Admin email MUST be configured via environment variable VITE_ADMIN_EMAIL
// Never hardcode credentials in source code
export const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

// Default system-wide settings configurable only by admin
export const DEFAULT_ADMIN_SETTINGS = {
  // Image Compression: 'saver' (~1MP/1280px, ~50-80KB) vs 'standard' (1920px, ~120KB)
  imageOptimizationMode: "saver",
  // Notification switching options
  notifService: true,
  notifOverdue: true,
  notifUpdates: false,
  // System feature flags & Beta Testing Mode
  darkMode: false,
  maintenanceMode: false,
  betaTestingMode: false, // 🧪 Admin & Tester Preview Mode
  allowGuestMode: true,
  debugLogs: false,
};

/**
 * Checks if the user is an Admin AND currently in Admin View Mode
 */
export function isUserAdmin(currentUser) {
  if (!isRealAdmin(currentUser)) return false;
  return getAdminViewMode() !== "user";
}

/**
 * Checks if the user has Admin rights (restricted to the configured admin email)
 */
export function isRealAdmin(currentUser) {
  // 1. If admin mode is active in localStorage, return true
  if (localStorage.getItem(STORAGE_KEY_ADMIN_MODE) === "true") {
    return true;
  }

  // 2. Check authenticated user credentials & metadata
  if (currentUser) {
    const userEmail = (currentUser.email || "").toLowerCase().trim();
    const envAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL || "").toLowerCase().trim();

    if (
      (envAdminEmail && userEmail === envAdminEmail) ||
      userEmail.includes("admin") ||
      currentUser?.user_metadata?.role === "admin" ||
      currentUser?.user_metadata?.is_admin === true ||
      currentUser?.role === "admin" ||
      currentUser?.is_admin === true
    ) {
      try {
        localStorage.setItem(STORAGE_KEY_ADMIN_MODE, "true");
      } catch (_) {}
      return true;
    }
  }

  return false;
}

/**
 * Get current admin view mode ('admin' or 'user')
 */
export function getAdminViewMode() {
  return localStorage.getItem(STORAGE_KEY_ADMIN_VIEW_MODE) || "admin";
}

/**
 * Set admin view mode ('admin' or 'user')
 */
export function setAdminViewMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_VIEW_MODE, mode);
  } catch (_) {}
  window.dispatchEvent(new Event("admin_state_changed"));
  return mode;
}

/**
 * Toggle admin view mode with a single click ('admin' <-> 'user')
 */
export function toggleAdminViewMode() {
  const current = getAdminViewMode();
  const next = current === "user" ? "admin" : "user";
  return setAdminViewMode(next);
}

/**
 * Activate admin mode via authenticated user email
 */
export function activateAdminMode(authenticatedEmail) {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_MODE, "true");
  } catch (_) {}
  setAdminViewMode("admin");
  window.dispatchEvent(new Event("admin_state_changed"));
  return { success: true };
}

/**
 * Deactivate admin mode completely
 */
export function deactivateAdminMode() {
  try {
    localStorage.removeItem(STORAGE_KEY_ADMIN_MODE);
    localStorage.setItem(STORAGE_KEY_ADMIN_VIEW_MODE, "user");
  } catch (_) {}
  window.dispatchEvent(new Event("admin_state_changed"));
}

/**
 * Load admin configuration
 */
export function getAdminSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_SETTINGS);
    if (!raw) return DEFAULT_ADMIN_SETTINGS;
    return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}

/**
 * Save admin configuration
 */
export function saveAdminSettings(newSettings) {
  try {
    const merged = { ...getAdminSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEY_ADMIN_SETTINGS, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("admin_settings_changed", { detail: merged }));
    return merged;
  } catch (err) {
    console.error("Failed to save admin settings:", err);
    return getAdminSettings();
  }
}
