import React, { useState, useEffect } from "react";
import { registerSW } from "virtual:pwa-register";
import updateService from "../services/UpdateService";
import { CURRENT_APP_VERSION } from "../config/version";
import { RefreshCw, Sparkles, ChevronDown, ChevronUp, X, CheckCircle2 } from "lucide-react";
import "./UpdateBanner.css";

// Key used to suppress the banner for the whole session after user clicks Update
const UPDATE_CLICKED_KEY = "nginebreak_update_clicked";

export default function UpdateBanner() {
  // If user already clicked Update this session (even after a reload), stay hidden
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(UPDATE_CLICKED_KEY) === "1"
  );
  const [showNotes, setShowNotes] = useState(false);
  const [latestRelease, setLatestRelease] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker with prompt mode handling
    const updateSW = registerSW({
      onNeedRefresh(registration) {
        console.log("[PWA] New update available & waiting service worker detected.");
        setSwRegistration(registration);
        setNeedRefresh(true);
      },
      onOfflineReady() {
        console.log("[PWA] Application is offline ready.");
        setOfflineReady(true);
        setTimeout(() => setOfflineReady(false), 4000);
      },
    });

    // 2. Secondary check against Supabase DB release records
    const checkDbRelease = async () => {
      try {
        const info = await updateService.checkForUpdates();
        if (info.hasUpdate) {
          setLatestRelease(info.release);
          setNeedRefresh(true);
        }
      } catch (err) {
        // Fallback silently without breaking the app
      }
    };

    checkDbRelease();

    return () => {
      // Cleanup if needed
    };
  }, []);

  if (dismissed || (!needRefresh && !offlineReady)) {
    return null;
  }

  // Toast for Offline Ready notification
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

  const handleUpdateClick = async () => {
    // Mark session immediately so banner stays hidden even after page reload
    sessionStorage.setItem(UPDATE_CLICKED_KEY, "1");
    setUpdating(true);
    setDismissed(true);
    await updateService.activateUpdate(swRegistration);
  };

  const handleLaterClick = () => {
    setDismissed(true);
  };

  return (
    <div className="update-banner-container animate-slide-up" role="alert" aria-live="polite">
      <div className="update-banner-card">
        <div className="update-banner-header">
          <div className="update-icon-wrapper">
            <RefreshCw size={18} className={`update-icon ${updating ? "spinning" : ""}`} />
          </div>

          <div className="update-text-area">
            <div className="update-headline">
              New NGINEBREAK update available {newVersionTag && <span className="version-pill">{newVersionTag}</span>}
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

        {/* Collapsible Release Highlights */}
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

        {/* Actions Bar */}
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
