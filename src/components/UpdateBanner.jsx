import React, { useState, useEffect, useRef } from "react";
import { registerSW } from "virtual:pwa-register";
import updateService, {
  compareSemver,
  getUserUpdatedVersion,
  setUserUpdatedVersion,
  getDismissedSessionVersion,
  setDismissedSessionVersion,
} from "../services/UpdateService";
import { supabase } from "../services/supabaseClient";
import { CURRENT_APP_VERSION } from "../config/version";
import { RefreshCw, ChevronDown, ChevronUp, X, CheckCircle2 } from "lucide-react";
import "./UpdateBanner.css";

export default function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [latestRelease, setLatestRelease] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Holds the updateServiceWorker() function returned by registerSW().
  // This is the ONLY correct way to activate a waiting SW via Workbox —
  // it calls wb.messageSkipWaiting() and waits for controllerchange before reloading.
  const updateSWRef = useRef(null);

  // Tracks whether the Service Worker independently confirmed new code is waiting.
  const swDetectedRef = useRef(false);

  // Evaluate whether a DB release should trigger the banner
  const evaluateRelease = (release) => {
    if (!release?.version) return false;
    const dbVersion = release.version;

    // Only show if DB version is strictly newer than what's running in app bundle
    const isNewerThanApp = compareSemver(dbVersion, CURRENT_APP_VERSION) > 0;
    if (!isNewerThanApp) return false;

    // Only show if user has not ALREADY updated to this version or higher
    const userUpdatedVer = getUserUpdatedVersion();
    if (userUpdatedVer && compareSemver(dbVersion, userUpdatedVer) <= 0) return false;

    // Don't show if user clicked 'Later' for THIS exact version during this browser session
    const alreadyDismissedSession = getDismissedSessionVersion() === dbVersion;
    if (alreadyDismissedSession) return false;

    setLatestRelease(release);
    setDismissed(false);
    setNeedRefresh(true);
    return true;
  };

  const checkDbRelease = async () => {
    try {
      const info = await updateService.checkForUpdates();
      if (info.hasUpdate && info.release) {
        evaluateRelease(info.release);
      } else if (!swDetectedRef.current) {
        // Only hide banner if the SW has NOT independently detected new code.
        // If swDetectedRef is true, new code IS waiting — never suppress it.
        setNeedRefresh(false);
      } else if (info.release) {
        // SW confirmed new code, but DB version isn't "newer" than bundle.
        // Still surface the release record so the banner has version info to show.
        setLatestRelease(info.release);
      }
    } catch (_) {
      // Fail silently
    }
  };

  useEffect(() => {
    // 0. Clean up _reload parameter from URL if arriving from a hard refresh
    if (window.location.search.includes("_reload=")) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("_reload");
        const cleanUrl = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState(null, "", cleanUrl);
      } catch (_) {}
    }

    // 1. Initial DB check on mount
    checkDbRelease();

    // 2. Register Service Worker (prompt mode) — detects new SW waiting.
    // IMPORTANT: registerSW() RETURNS the updateServiceWorker function.
    // onNeedRefresh is called with NO arguments by vite-plugin-pwa v1.x —
    // the return value is what must be called to activate the waiting SW.
    const updateSWFn = registerSW({
      onNeedRefresh() {
        console.log("[PWA] New SW waiting detected — new code is ready.");
        // SW is the authoritative source: new code is waiting.
        // Always show the banner immediately.
        swDetectedRef.current = true;
        setDismissed(false);  // Reset any session dismissal — this is genuinely new code
        setNeedRefresh(true); // Show banner right now, don't wait for DB
        checkDbRelease();     // Enrich banner with DB release notes/version in background
      },
      onOfflineReady() {
        console.log("[PWA] App offline ready.");
        setOfflineReady(true);
        setTimeout(() => setOfflineReady(false), 4000);
      },
    });
    // Store the Workbox updateSW function — this is the correct activation path
    updateSWRef.current = updateSWFn;

    // 3. Supabase Realtime — listen for new releases pushed by admin in real time
    let realtimeChannel = null;
    if (supabase) {
      realtimeChannel = supabase
        .channel("live-app-releases")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_releases" },
          async (payload) => {
            const row = payload.new || payload.old;
            if (!row?.is_current) return;
            console.log("[UpdateBanner] Realtime: new current release →", row.version);

            // Proactively tell the Service Worker to fetch the latest assets from server
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.getRegistrations().then((regs) => {
                regs.forEach((r) => r.update().catch(() => {}));
              });
            }

            checkDbRelease();
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED")
            console.log("[UpdateBanner] Realtime: app_releases channel active");
        });
    }

    return () => {
      if (realtimeChannel) {
        supabase?.removeChannel(realtimeChannel);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render guard
  if (dismissed || (!needRefresh && !offlineReady)) {
    return null;
  }

  // Offline-ready toast
  if (offlineReady && !needRefresh) {
    return (
      <div className="update-banner-container offline-toast">
        <div className="update-banner-content">
          <CheckCircle2 size={18} className="update-icon success" />
          <span className="update-title">NGINEBREAK is ready for offline use</span>
        </div>
      </div>
    );
  }

  const newVersionTag = latestRelease?.version ? `v${latestRelease.version}` : "";
  const releaseTitle = latestRelease?.title || "Latest improvements & performance updates";
  const rawNotes = latestRelease?.description || "";
  const notesList = rawNotes
    ? rawNotes
        .split("\n")
        .map((s) => s.replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  // Handlers
  const handleUpdateClick = async () => {
    const targetVersion = latestRelease?.version;
    if (targetVersion) {
      setUserUpdatedVersion(targetVersion);
      setDismissedSessionVersion(targetVersion);
    }
    setUpdating(true);
    // Pass the Workbox updateSW function — executes SW skipWaiting, clears all caches, and hard refreshes
    await updateService.activateUpdate(updateSWRef.current);
  };

  const handleLaterClick = () => {
    const targetVersion = latestRelease?.version;
    if (targetVersion) {
      setDismissedSessionVersion(targetVersion);
    }
    setDismissed(true);
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <div className="update-banner-container animate-slide-up" role="alert" aria-live="polite">
      <div className="update-banner-card">
        <div className="update-banner-header">
          <div className="update-icon-wrapper">
            <RefreshCw size={18} className={`update-icon ${updating ? "spinning" : ""}`} />
          </div>

          <div className="update-text-area">
            <div className="update-headline">
              New NGINEBREAK update available{" "}
              {newVersionTag && <span className="version-pill">{newVersionTag}</span>}
            </div>
            <div className="update-subtext">Refresh to use the latest production version.</div>

            {notesList.length > 0 && (
              <button
                className="whats-new-toggle"
                onClick={() => setShowNotes(!showNotes)}
                type="button"
              >
                <span>What's new</span>
                {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

          <button
            className="update-close-btn"
            onClick={handleLaterClick}
            aria-label="Dismiss update banner"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Collapsible Release Notes */}
        {showNotes && (
          <div className="update-notes-box">
            <div className="update-notes-title">{releaseTitle}</div>
            <ul className="update-notes-list">
              {notesList.slice(0, 3).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="update-actions-bar">
          <button
            className="btn-update-later"
            onClick={handleLaterClick}
            disabled={updating}
            type="button"
          >
            Later
          </button>
          <button
            className="btn-update-now"
            onClick={handleUpdateClick}
            disabled={updating}
            type="button"
          >
            {updating ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

