/**
 * Admin Role & System Settings Management for Nginebreak
 *
 * SECURITY MODEL:
 * Admin status is determined exclusively by:
 *   1. Email exact-match against VITE_ADMIN_EMAIL env variable (set server-side)
 *   2. Supabase user_metadata.role === "admin"  (set via Supabase dashboard/service-role key only)
 *   3. Supabase user_metadata.is_admin === true  (same, service-role only)
 *   4. Database profiles.is_admin === true        (set via Supabase dashboard/RLS policies)
 *
 * NEVER grants admin based on:
 *   - Arbitrary string matching ("admin" in name/email)
 *   - Anything stored in localStorage alone (localStorage can be spoofed)
 */

const STORAGE_KEY_ADMIN_SETTINGS  = "nginebreak_admin_settings";
const STORAGE_KEY_ADMIN_VIEW_MODE = "nginebreak_admin_view_mode"; // 'admin' | 'user'

// ── Resolved only once at module init to prevent tampering ──────────────────
// Default to repository owner wopstrat@gmail.com if VITE_ADMIN_EMAIL is not passed during production build
const ENV_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "wopstrat@gmail.com").toLowerCase().trim();

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
  betaTestingMode: false,
  allowGuestMode: true,
  debugLogs: false,
};

/**
 * isRealAdmin — the single source-of-truth for admin status.
 *
 * Checks ONLY verified/server-side sources:
 *   1. Env email exact match (VITE_ADMIN_EMAIL or default fallback)
 *   2. Supabase app_metadata / user_metadata role === "admin"
 *   3. Supabase app_metadata / user_metadata is_admin === true
 *   4. profiles table is_admin flag / role === "admin" (passed in as userProfile)
 *
 * Does NOT rely on localStorage (easily spoofed).
 * Does NOT use fuzzy string matching on email/display_name.
 */
export function isRealAdmin(currentUser, userProfile) {
  if (!currentUser) return false;

  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const metaRole = (
    currentUser.app_metadata?.role ||
    currentUser.user_metadata?.role ||
    currentUser.role ||
    userProfile?.role ||
    ""
  ).toLowerCase().trim();
  const metaIsAdmin =
    currentUser.app_metadata?.is_admin === true ||
    currentUser.user_metadata?.is_admin === true ||
    userProfile?.is_admin === true;

  // Check 1: env-configured admin email (exact match only)
  if (ENV_ADMIN_EMAIL && userEmail === ENV_ADMIN_EMAIL) return true;

  // Check 2: Supabase role metadata set via dashboard, app_metadata, or profile
  if (metaRole === "admin") return true;

  // Check 3: explicit is_admin flag in user metadata, app metadata, or profile
  if (metaIsAdmin) return true;

  return false;
}

/**
 * isUserAdmin — checks isRealAdmin AND that the admin hasn't switched to user-view mode.
 */
export function isUserAdmin(currentUser, userProfile) {
  if (!isRealAdmin(currentUser, userProfile)) return false;
  return getAdminViewMode() !== "user";
}

/**
 * Get current admin view mode ('admin' or 'user').
 * Only meaningful for accounts that are already verified as real admins.
 */
export function getAdminViewMode() {
  try {
    return localStorage.getItem(STORAGE_KEY_ADMIN_VIEW_MODE) || "admin";
  } catch (_) {
    return "admin";
  }
}

/**
 * Set admin view mode ('admin' or 'user').
 * This only affects the UI mode toggle — not actual admin privilege.
 */
export function setAdminViewMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_VIEW_MODE, mode);
  } catch (_) {}
  window.dispatchEvent(new Event("admin_state_changed"));
  return mode;
}

/**
 * Toggle admin view mode between 'admin' and 'user'.
 */
export function toggleAdminViewMode() {
  const current = getAdminViewMode();
  const next = current === "user" ? "admin" : "user";
  return setAdminViewMode(next);
}

/**
 * Activate admin UI mode — sets view mode if user is an admin.
 * This sets the view-mode pref; it does NOT grant admin rights.
 */
export function activateAdminMode(authenticatedEmail, currentUser, userProfile) {
  const email = (authenticatedEmail || currentUser?.email || "").toLowerCase().trim();
  const matchesEnv = ENV_ADMIN_EMAIL && email === ENV_ADMIN_EMAIL;
  const verifiedAdmin = matchesEnv || isRealAdmin(currentUser || { email }, userProfile);

  if (!verifiedAdmin && ENV_ADMIN_EMAIL && email !== ENV_ADMIN_EMAIL) {
    return { success: false, reason: "Unauthorized" };
  }
  setAdminViewMode("admin");
  window.dispatchEvent(new Event("admin_state_changed"));
  return { success: true };
}

/**
 * Deactivate admin mode (switch to user view).
 * Does NOT revoke actual admin rights — those are server-determined.
 */
export function deactivateAdminMode() {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_VIEW_MODE, "user");
  } catch (_) {}
  window.dispatchEvent(new Event("admin_state_changed"));
}

/**
 * Load admin configuration from localStorage.
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
 * Save admin configuration to localStorage.
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
