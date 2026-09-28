import { supabase } from "./supabaseClient";
import { CURRENT_APP_VERSION } from "../config/version";

// Built-in static release history fallback for offline / initial state
export const STATIC_RELEASES = [
  {
    id: "v1.4.0",
    version: "1.4.0",
    release_date: "2026-09-24",
    title: "Application Update System & Realtime Sync",
    description: "• Production-ready PWA background update detection\n• Admin Version History management\n• Safe non-intrusive update prompt",
    release_type: "minor",
    created_by: "Admin",
    is_current: true,
  },
  {
    id: "v1.3.2",
    version: "1.3.2",
    release_date: "2026-09-18",
    title: "Shared Garage & Profile Sync",
    description: "• Multi-user collaboration for family & fleet garages\n• Real-time vehicle sync across members",
    release_type: "patch",
    created_by: "Admin",
    is_current: false,
  },
  {
    id: "v1.3.1",
    version: "1.3.1",
    release_date: "2026-09-12",
    title: "PWA Offline & Notification Engine",
    description: "• Web push notifications for upcoming maintenance\n• Background service worker caching",
    release_type: "patch",
    created_by: "Admin",
    is_current: false,
  },
  {
    id: "v1.3.0",
    version: "1.3.0",
    release_date: "2026-09-05",
    title: "Maintenance & Odometer Tracking",
    description: "• Core vehicle lifecycle management\n• Odometer log tracking and service intervals",
    release_type: "minor",
    created_by: "Admin",
    is_current: false,
  },
];

const STORAGE_KEY_RELEASES = "nginebreak_app_releases_cache";
const STORAGE_KEY_USER_UPDATED = "nginebreak_user_updated_version";
const STORAGE_KEY_DISMISSED_SESSION = "nginebreak_dismissed_session_version";

export function getUserUpdatedVersion() {
  try {
    return localStorage.getItem(STORAGE_KEY_USER_UPDATED) || "";
  } catch (_) {
    return "";
  }
}

export function setUserUpdatedVersion(version) {
  try {
    if (version) {
      localStorage.setItem(STORAGE_KEY_USER_UPDATED, String(version).trim());
    }
  } catch (_) {}
}

export function getDismissedSessionVersion() {
  try {
    return sessionStorage.getItem(STORAGE_KEY_DISMISSED_SESSION) || "";
  } catch (_) {
    return "";
  }
}

export function setDismissedSessionVersion(version) {
  try {
    if (version) {
      sessionStorage.setItem(STORAGE_KEY_DISMISSED_SESSION, String(version).trim());
    }
  } catch (_) {}
}

function getLocalReleases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RELEASES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return STATIC_RELEASES;
}

function saveLocalReleases(releases) {
  try {
    localStorage.setItem(STORAGE_KEY_RELEASES, JSON.stringify(releases));
  } catch (_) {}
}

/**
 * Compare semantic versions (e.g. "1.4.0" vs "1.3.2")
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
 */
export function compareSemver(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean1 = String(v1).replace(/^v/i, "").trim().split(".").map(Number);
  const clean2 = String(v2).replace(/^v/i, "").trim().split(".").map(Number);

  const len = Math.max(clean1.length, clean2.length);
  for (let i = 0; i < len; i++) {
    const num1 = clean1[i] || 0;
    const num2 = clean2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

class UpdateService {
  constructor() {
    this.currentVersion = CURRENT_APP_VERSION;
  }

  /**
   * Fetch all releases, sorted by version DESC, ensuring strictly ONE current release.
   */
  async getReleases() {
    let rels = getLocalReleases();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("app_releases")
          .select("*")
          .order("release_date", { ascending: false });

        if (!error && data && data.length > 0) {
          rels = data;
        }
      } catch (err) {
        // Fallback to local
      }
    }

    // Sort by version (highest semver first)
    rels.sort((a, b) => compareSemver(b.version, a.version));

    // Ensure strictly ONLY ONE release is marked as current
    let foundCurrent = false;
    rels.forEach((r) => {
      if (r.is_current) {
        if (!foundCurrent) {
          foundCurrent = true;
        } else {
          r.is_current = false;
          // Clean up duplicate current flag in DB if connected
          if (supabase && r.id) {
            supabase.from("app_releases").update({ is_current: false }).eq("id", r.id).then(() => {}).catch(() => {});
          }
        }
      }
    });

    // If no current release exists, default the highest version to current
    if (!foundCurrent && rels.length > 0) {
      rels[0].is_current = true;
      if (supabase && rels[0].id) {
        supabase.from("app_releases").update({ is_current: true }).eq("id", rels[0].id).then(() => {}).catch(() => {});
      }
    }

    saveLocalReleases(rels);
    return rels;
  }

  /**
   * Get current active release record
   */
  async getCurrentRelease() {
    try {
      const releases = await this.getReleases();
      const current = releases.find((r) => r.is_current) || releases[0];
      return current || STATIC_RELEASES[0];
    } catch (_) {
      return STATIC_RELEASES[0];
    }
  }

  /**
   * Asynchronously check if a newer version is deployed in DB
   */
  async checkForUpdates() {
    try {
      const currentRel = await this.getCurrentRelease();
      const dbVersion = currentRel?.version;
      const userUpdatedVer = getUserUpdatedVersion();

      // Update is available ONLY IF dbVersion is strictly newer than app bundle version
      // AND user hasn't already updated to this dbVersion or higher
      const isNewerThanApp = compareSemver(dbVersion, this.currentVersion) > 0;
      const isNewerThanUserUpdated = !userUpdatedVer || compareSemver(dbVersion, userUpdatedVer) > 0;

      const hasUpdate = isNewerThanApp && isNewerThanUserUpdated;

      return {
        hasUpdate,
        runningVersion: this.currentVersion,
        userUpdatedVersion: userUpdatedVer,
        latestVersion: dbVersion || this.currentVersion,
        release: currentRel,
      };
    } catch (err) {
      return {
        hasUpdate: false,
        runningVersion: this.currentVersion,
        userUpdatedVersion: getUserUpdatedVersion(),
        latestVersion: this.currentVersion,
        release: null,
      };
    }
  }

  /**
   * Admin: Add a new release record (unsets is_current on all other releases)
   */
  async createRelease(releaseData) {
    const cleanVersion = releaseData.version.replace(/^v/i, "").trim();
    const isCurrent = releaseData.is_current !== undefined ? !!releaseData.is_current : true;

    const payload = {
      id: "rel_" + Date.now(),
      version: cleanVersion,
      title: releaseData.title,
      description: releaseData.description || "",
      release_type: releaseData.release_type || "minor",
      release_date: releaseData.release_date || new Date().toISOString().split("T")[0],
      created_by: releaseData.created_by || "Admin",
      is_current: isCurrent,
    };

    if (supabase) {
      try {
        if (isCurrent) {
          // Properly formatted PostgREST query to unset existing current flag
          await supabase.from("app_releases").update({ is_current: false }).eq("is_current", true);
        }

        const { data, error } = await supabase
          .from("app_releases")
          .insert([{
            version: payload.version,
            title: payload.title,
            description: payload.description,
            release_type: payload.release_type,
            release_date: payload.release_date,
            created_by: payload.created_by,
            is_current: payload.is_current,
          }])
          .select()
          .single();

        if (!error && data) {
          payload.id = data.id;
        }
      } catch (err) {
        console.warn("[UpdateService] Supabase insert warning:", err.message);
      }
    }

    // Sync local storage state
    const local = getLocalReleases();
    if (isCurrent) {
      local.forEach((r) => (r.is_current = false));
    }
    // Filter out if duplicate version exists
    const filtered = local.filter((r) => r.version !== payload.version);
    const updated = [payload, ...filtered];
    saveLocalReleases(updated);

    return payload;
  }

  /**
   * Admin: Update an existing release record
   */
  async updateRelease(id, releaseData) {
    const cleanVersion = releaseData.version.replace(/^v/i, "").trim();
    const isCurrent = !!releaseData.is_current;

    const payload = {
      version: cleanVersion,
      title: releaseData.title,
      description: releaseData.description || "",
      release_type: releaseData.release_type || "minor",
      release_date: releaseData.release_date || new Date().toISOString().split("T")[0],
      created_by: releaseData.created_by || "Admin",
      is_current: isCurrent,
    };

    if (supabase) {
      try {
        if (isCurrent) {
          await supabase.from("app_releases").update({ is_current: false }).eq("is_current", true);
        }

        await supabase.from("app_releases").update(payload).or(`id.eq.${id},version.eq.${cleanVersion}`);
      } catch (err) {
        console.warn("[UpdateService] Supabase update warning:", err.message);
      }
    }

    // Update local storage
    const local = getLocalReleases();
    if (isCurrent) {
      local.forEach((r) => (r.is_current = false));
    }
    const idx = local.findIndex((r) => r.id === id || r.version === cleanVersion);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...payload };
    } else {
      local.unshift({ id, ...payload });
    }
    saveLocalReleases(local);
    return { id, ...payload };
  }

  /**
   * Admin: Set release as current (strictly unsets all others)
   */
  async markAsCurrent(id) {
    if (supabase) {
      try {
        await supabase.from("app_releases").update({ is_current: false }).eq("is_current", true);
        await supabase.from("app_releases").update({ is_current: true }).or(`id.eq.${id},version.eq.${id}`);
      } catch (err) {
        console.warn("[UpdateService] Supabase markAsCurrent warning:", err.message);
      }
    }

    const local = getLocalReleases();
    local.forEach((r) => {
      r.is_current = (r.id === id || r.version === id);
    });
    saveLocalReleases(local);
    return true;
  }

  /**
   * Admin: Delete release record
   */
  async deleteRelease(id) {
    const cleanId = String(id || "").replace(/[^a-zA-Z0-9_\-\.]/g, "");
    if (!cleanId) return false;
    if (supabase) {
      try {
        await supabase.from("app_releases").delete().or(`id.eq.${cleanId},version.eq.${cleanId}`);
      } catch (err) {
        console.warn("[UpdateService] Supabase delete warning:", err.message);
      }
    }

    const local = getLocalReleases();
    const filtered = local.filter((r) => r.id !== id && r.version !== id);
    saveLocalReleases(filtered);
    return true;
  }

  /**
   * Safely execute SW skipWaiting, unregister stale workers, purge all caches, and hard reload page
   */
  async activateUpdate(swHandler) {
    try {
      // 1. If swHandler is the updateServiceWorker function returned by registerSW, invoke it
      if (typeof swHandler === "function") {
        try {
          await swHandler(true);
        } catch (e) {
          console.warn("[UpdateService] swHandler warning:", e);
        }
      } else if (swHandler && swHandler.waiting) {
        try {
          swHandler.waiting.postMessage({ type: "SKIP_WAITING" });
        } catch (e) {
          console.warn("[UpdateService] sw waiting postMessage warning:", e);
        }
      }

      // 2. Clear all Service Worker registrations so the reload is never intercepted by a stale worker
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
            if (reg.installing) {
              reg.installing.postMessage({ type: "SKIP_WAITING" });
            }
            await reg.unregister().catch(() => {});
          }
        } catch (e) {
          console.warn("[UpdateService] ServiceWorker unregister warning:", e);
        }
      }

      // 3. Purge ALL CacheStorage caches (Workbox, Vite assets, precache, html)
      if ("caches" in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        } catch (e) {
          console.warn("[UpdateService] Cache delete warning:", e);
        }
      }

      // 4. Clear dismissed session version
      try {
        sessionStorage.removeItem(STORAGE_KEY_DISMISSED_SESSION);
      } catch (_) {}
    } catch (e) {
      console.warn("[UpdateService] activateUpdate error:", e);
    } finally {
      // 5. Guaranteed Hard Refresh: Append cache-busting timestamp so the browser
      // completely bypasses HTTP disk/memory cache and loads the fresh bundle from server
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("_reload", Date.now().toString());
        window.location.replace(url.toString());
      } catch (_) {
        window.location.reload();
      }
    }
  }
}

export const updateService = new UpdateService();
export default updateService;
