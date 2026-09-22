import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { calculateMaintenanceStatus, STATUS } from "./CalculationEngine";

// Standard Web Push VAPID Public Key (Application Server Key)
const VAPID_PUBLIC_KEY =
  "BJqVz7gR31nU6R6F5qO5R9xLw1W6lR8kQ9mN3zB4cV8fD1gH2jK5lP8oI9uY7tE4rW1qA2sD3fG4hJ5kL6==";

/**
 * Utility: Convert base64 string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  try {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch {
    return null;
  }
}

const DEFAULT_PREFERENCES = {
  maintenanceReminders: true,
  sharedGarageUpdates: true,
  odometerUpdates: true,
};

class NotificationService {
  constructor() {
    this.cachedPreferences = null;
    this.lastCheckedTimestamp = 0;
  }

  /**
   * Check if Notifications & ServiceWorker are supported in the current environment
   */
  isSupported() {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator
    );
  }

  /**
   * Get current permission state: 'granted' | 'denied' | 'default' | 'unsupported'
   */
  getPermissionState() {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  }

  /**
   * Request browser/device notification permission
   */
  async requestPermission() {
    if (!this.isSupported()) return "unsupported";
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn("[NotificationService] Permission request failed:", err);
      return "denied";
    }
  }

  /**
   * Register push subscription with the browser and save securely to database
   */
  async subscribeUser(userId, userEmail) {
    if (!this.isSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) {
        console.warn("[NotificationService] PushManager not available on registration");
        return null;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        const subscribeOptions = {
          userVisibleOnly: true,
          ...(applicationServerKey ? { applicationServerKey } : {}),
        };
        try {
          subscription = await registration.pushManager.subscribe(subscribeOptions);
        } catch (subErr) {
          console.warn("[NotificationService] Push subscribe fallback:", subErr);
          // If VAPID key failed, try without key
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
          });
        }
      }

      if (subscription) {
        await this.saveSubscriptionToDatabase(userId, userEmail, subscription);
      }

      return subscription;
    } catch (err) {
      console.warn("[NotificationService] Failed to create push subscription:", err);
      return null;
    }
  }

  /**
   * Save push subscription for multi-device support
   */
  async saveSubscriptionToDatabase(userId, userEmail, subscription) {
    if (!subscription) return;
    const subJson = subscription.toJSON ? subscription.toJSON() : subscription;

    const deviceRecord = {
      endpoint: subJson.endpoint || subscription.endpoint,
      keys: subJson.keys || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      updated_at: new Date().toISOString(),
    };

    // Save locally
    try {
      const storageKey = userId ? `nginebreak_push_sub_${userId}` : "nginebreak_push_sub_guest";
      localStorage.setItem(storageKey, JSON.stringify(deviceRecord));
    } catch (_) {}

    // Save to Supabase if configured
    if (isSupabaseConfigured() && supabase && userId) {
      try {
        // Try dedicated push_subscriptions table
        await supabase.from("push_subscriptions").upsert([
          {
            user_id: userId,
            endpoint: deviceRecord.endpoint,
            keys: deviceRecord.keys,
            user_agent: deviceRecord.user_agent,
            updated_at: deviceRecord.updated_at,
          },
        ]);
      } catch (_) {
        // Graceful fallback: store in profiles notification_subscriptions JSON
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("notification_subscriptions")
            .eq("id", userId)
            .maybeSingle();

          let subs = Array.isArray(profile?.notification_subscriptions)
            ? profile.notification_subscriptions
            : [];
          subs = subs.filter((s) => s.endpoint !== deviceRecord.endpoint);
          subs.push(deviceRecord);

          await supabase
            .from("profiles")
            .update({ notification_subscriptions: subs })
            .eq("id", userId);
        } catch (__) {}
      }
    }
  }

  /**
   * Get user notification preferences
   */
  getPreferences(userId) {
    const key = userId ? `nginebreak_notif_prefs_${userId}` : "nginebreak_notif_prefs_guest";
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * Save user notification preferences
   */
  async savePreferences(userId, prefs) {
    const key = userId ? `nginebreak_notif_prefs_${userId}` : "nginebreak_notif_prefs_guest";
    const merged = { ...DEFAULT_PREFERENCES, ...prefs };
    try {
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (_) {}

    if (isSupabaseConfigured() && supabase && userId) {
      try {
        await supabase
          .from("profiles")
          .update({ notification_preferences: merged })
          .eq("id", userId);
      } catch (_) {}
    }
    return merged;
  }

  /**
   * Send a browser / PWA notification
   */
  async sendNotification({ title, body, icon, tag, data }) {
    if (this.getPermissionState() !== "granted") return false;

    const notifOptions = {
      body: body || "",
      icon: icon || "/pwa-192x192.png",
      badge: "/favicon.ico",
      tag: tag || "nginebreak-alert",
      data: data || { url: "/" },
      vibrate: [100, 50, 100],
      renotify: true,
    };

    // Try service worker showNotification first (best for PWA & mobile)
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title || "NGINEBREAK", notifOptions);
          return true;
        }
      }
    } catch (swErr) {
      console.warn("[NotificationService] ServiceWorker notification error:", swErr);
    }

    // Fallback to standard Window Notification
    try {
      if ("Notification" in window) {
        new Notification(title || "NGINEBREAK", notifOptions);
        return true;
      }
    } catch (wErr) {
      console.warn("[NotificationService] Window notification error:", wErr);
    }

    return false;
  }

  /**
   * Check maintenance items and dispatch alerts based on CalculationEngine results
   */
  async checkMaintenanceNotifications(vehicles, userId, force = false) {
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) return;
    if (this.getPermissionState() !== "granted") return;

    const prefs = this.getPreferences(userId);
    if (!prefs.maintenanceReminders) return;

    const now = Date.now();
    // Debounce rapid repeated checks unless forced
    if (!force && now - this.lastCheckedTimestamp < 15 * 1000) return;
    this.lastCheckedTimestamp = now;

    for (const vehicle of vehicles) {
      if (!vehicle || !vehicle.maintenance_modules || !Array.isArray(vehicle.maintenance_modules)) continue;

      const vehicleName =
        vehicle.name ||
        [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
        "Your Vehicle";
      const currentOdometer = Number(vehicle.current_odometer) || 0;

      for (const mod of vehicle.maintenance_modules) {
        if (!mod) continue;
        const calc = calculateMaintenanceStatus(mod, currentOdometer, new Date());
        const status = calc.status;

        if (status === STATUS.DUE_SOON || status === STATUS.OVERDUE || status === STATUS.DUE) {
          const cacheKey = `nginebreak_notif_sent_${vehicle.id}_${mod.id}_${status}`;
          const lastSent = localStorage.getItem(cacheKey);
          // Don't send same notification more than once every 24 hours
          if (lastSent && now - Number(lastSent) < 24 * 60 * 60 * 1000) {
            continue;
          }

          let title = "🔧 NGINEBREAK";
          let body = "";

          if (status === STATUS.OVERDUE || status === STATUS.DUE) {
            title = "⚠️ NGINEBREAK";
            const dueKmStr = calc.next_due_km
              ? `${calc.next_due_km.toLocaleString()} km`
              : null;
            body = dueKmStr
              ? `${mod.name} maintenance is due.\n${vehicleName} — ${dueKmStr}.`
              : `${mod.name} maintenance is due.\n${vehicleName}.`;
          } else if (status === STATUS.DUE_SOON) {
            if (calc.remaining_km !== null && calc.remaining_km <= 500) {
              body = `${mod.name} is due soon.\n${vehicleName} — ${calc.remaining_km.toLocaleString()} km remaining.`;
            } else if (calc.remaining_days !== null && calc.remaining_days <= 30) {
              body = `${mod.name} is due in ${calc.remaining_days} days.\n${vehicleName}.`;
            } else {
              body = `${mod.name} is due soon for ${vehicleName}.`;
            }
          }

          if (body) {
            await this.sendNotification({
              title,
              body,
              tag: `maintenance-${vehicle.id}-${mod.id}`,
              data: { url: `/vehicle/${vehicle.id}` },
            });
            localStorage.setItem(cacheKey, String(now));
          }
        }
      }
    }
  }

  /**
   * Dispatch shared odometer update notification
   */
  async notifyOdometerUpdate(vehicle, newOdometer, updaterName, userId) {
    if (!vehicle) return;
    if (this.getPermissionState() !== "granted") return;

    const prefs = this.getPreferences(userId);
    if (!prefs.odometerUpdates && !prefs.sharedGarageUpdates) return;

    const vehicleName =
      vehicle.name ||
      `${vehicle.make || "Vehicle"} ${vehicle.model || ""}`.trim();
    const userLabel = updaterName || "Vehicle partner";
    const kmStr = Number(newOdometer).toLocaleString();

    await this.sendNotification({
      title: "🚗 NGINEBREAK",
      body: `${userLabel} updated the odometer.\n${vehicleName} — ${kmStr} km.`,
      tag: `odo-${vehicle.id}-${Date.now()}`,
      data: { url: `/vehicle/${vehicle.id}` },
    });
  }

  /**
   * Dispatch shared maintenance completed notification
   */
  async notifyServiceCompleted(vehicle, moduleName, completedByName, userId) {
    if (!vehicle) return;
    if (this.getPermissionState() !== "granted") return;

    const prefs = this.getPreferences(userId);
    if (!prefs.sharedGarageUpdates) return;

    const vehicleName =
      vehicle.name ||
      `${vehicle.make || "Vehicle"} ${vehicle.model || ""}`.trim();
    const userLabel = completedByName || "Vehicle partner";

    await this.sendNotification({
      title: "🔧 NGINEBREAK",
      body: `${userLabel} completed ${moduleName || "service"}.\n${vehicleName}.`,
      tag: `service-${vehicle.id}-${Date.now()}`,
      data: { url: `/vehicle/${vehicle.id}` },
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
