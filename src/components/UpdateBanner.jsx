import React, { useState, useEffect, useRef } from "react";
import { registerSW } from "virtual:pwa-register";
import updateService, { compareSemver } from "../services/UpdateService";
import { supabase } from "../services/supabaseClient";
import { CURRENT_APP_VERSION } from "../config/version";
import { RefreshCw, ChevronDown, ChevronUp, X, CheckCircle2 } from "lucide-react";
import "./UpdateBanner.css";

// Stores the version the user already acted on (dismissed or updated).
// Only suppresses THAT specific version — newer versions will still show.
const DISMISSED_VERSION_KEY = "nginebreak_dismissed_version";

function getDismissedVersion() {
  try { return sessionStorage.getItem(DISMISSED_VERSION_KEY) || ""; } catch (_) { return ""; }
}
function setDismissedVersion(version) {
  try { sessionStorage.setItem(DISMISSED_VERSION_KEY, version); } catch (_) {}
}

export default function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [latestRelease, setLatestRelease] = useState(null);
  const [updating, setUpdating] = useState(false);

  // -----------------------------------------------------------------
  // Evaluate whether a DB release should trigger the banner
  // -----------------------------------------------------------------
  const evaluateRelease = (release) => {
    if (!release?.version) return;
    const dbVersion = release.version;

    // Only show if DB version is strictly newer than what's running
    const isNewer = compareSemver(dbVersion, CURRENT_APP_VERSION) > 0;
    if (!isNewer) return;

    // Don't show if user already dismissed/updated THIS exact version this session
    const alreadyDismissed = getDismissedVersion() === dbVersion;
    if (alreadyDismissed) return;

    setLatestRelease(release);
    setDismissed(false);
    setNeedRefresh(true);
  };

  useEffect(() => {
    // 1. Register Service Worker (prompt mode) — detects new SW waiting
    registerSW({
      onNeedRefresh(registration) {
        console.log("[PWA] New SW waiting detected.");
        setSwRegistration(registration);
        setNeedRefresh(true);
      },
      onOfflineReady() {
        console.log("[PWA] App offline ready.");
        setOfflineReady(true);
        setTimeout(() => setOfflineReady(false), 4000);
      },
    });

    // 2. Initial DB check on mount
    const checkDbRelease = async () => {
      try {
        const info = await updateService.checkForUpdates();
        if (info.hasUpdate) {
          evaluateRelease(info.release);
        }
      } catch (_) {
        // Fail silently — never break the app
      }
    };
    checkDbRelease();

    // 3. Supabase Realtime — listen for new releases pushed by admin in real time.
    //    This fires for INSERT and UPDATE on app_releases so active users are
    //    notified the moment admin marks a new version as current — no page reload needed.
    let realtimeChannel = null;
    if (supabase) {
      realtimeChannel = supabase
        .channel("live-app-releases")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_releases" },
          async (payload) => {
            const row = payload.new || payload.old;
            // Only react when a release is being marked as current
            if (!row?.is_current) return;
            console.log("[UpdateBanner] Realtime: new current release →", row.version);
            // Re-fetch full record from DB and evaluate
            try {
              const info = await updateService.checkForUpdates();
              if (info.hasUpdate) {
                evaluateRelease(info.release);
              }
            } catch (_) {}
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

  // -----------------------------------------------------------------
  // Render guard
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const handleUpdateClick = async () => {
    // Record which version was acted on — suppresses THIS version after
    // reload but allows any future newer version to show through
    if (latestRelease?.version) {
      setDismissedVersion(latestRelease.version);
    }
    setUpdating(true);
    setDismissed(true);
    await updateService.activateUpdate(swRegistration);
  };

  const handleLaterClick = () => {
    if (latestRelease?.version) {
      setDismissedVersion(latestRelease.version);
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

