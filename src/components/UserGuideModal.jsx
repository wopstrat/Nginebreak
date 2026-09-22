import React, { useState } from "react";
import {
  Car,
  Wrench,
  Users,
  Gauge,
  Clock,
  CheckCircle2,
  X,
<<<<<<< HEAD
=======
  ChevronRight,
>>>>>>> 44a1432e292ae34961120febd5fcd58e02253a79
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
<<<<<<< HEAD
  ChevronLeft,
} from "lucide-react";

/**
 * UserGuideModal
 *
 * Simple, modern, and friendly user guide modal with a frosted glass blurry backdrop.
 * Standard professional compact buttons, fully responsive across all screen sizes.
 *
 * mode="onboarding" — 5-step first-time product tour (new members only)
 * mode="guide"      — "How NGINEBREAK Works" reference
=======
} from "lucide-react";

/**
 * UserGuideModal Component
 * Supports 2 modes:
 * 1) mode="onboarding" — 5-Screen First-Time User Tour
 * 2) mode="guide" — "HOW NGINEBREAK WORKS" Manual / User Guide
>>>>>>> 44a1432e292ae34961120febd5fcd58e02253a79
 */
export default function UserGuideModal({
  mode = "onboarding",
  onClose,
  onComplete,
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [step, setStep] = useState(1);
<<<<<<< HEAD
=======

>>>>>>> 44a1432e292ae34961120febd5fcd58e02253a79
  const totalSteps = 5;

  const handleSkip = () => {
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

<<<<<<< HEAD
  const handleFinish = () => {
=======
  const handleFinishOnboarding = () => {
>>>>>>> 44a1432e292ae34961120febd5fcd58e02253a79
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  return (
<<<<<<< HEAD
    <>
      {/* ── CSS Styles ────────────────────────────────────────── */}
      <style>{`
        /* Blurry Frosted Glass Backdrop (like iOS / X / WhatsApp dialogs) */
        .ugm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 10, 0.6);
          backdrop-filter: blur(14px) saturate(170%);
          -webkit-backdrop-filter: blur(14px) saturate(170%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          animation: ugmFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes ugmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ugmScaleIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Clean Modern Card */
        .ugm-dialog {
          background: var(--bg-card, #ffffff);
          color: var(--text-primary, #0a0a0a);
          width: 100%;
          max-width: 380px;
          max-height: min(90vh, 580px);
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.09);
          box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: ugmScaleIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Header */
        .ugm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 8px;
          flex-shrink: 0;
        }

        .ugm-step-pills {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .ugm-step-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--border-color, #e5e5e5);
          transition: all 0.25s ease;
        }

        .ugm-step-dot.active {
          width: 18px;
          background: var(--accent-color, #ff4d00);
        }

        .ugm-close-btn {
          background: none;
          border: none;
          padding: 6px;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-muted, #999999);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .ugm-close-btn:hover {
          background: var(--accent-light, rgba(255, 77, 0, 0.08));
          color: var(--text-primary, #0a0a0a);
        }

        /* Content Area */
        .ugm-content {
          flex: 1;
          overflow-y: auto;
          padding: 4px 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          overscroll-behavior: contain;
        }

        /* Icon Container */
        .ugm-icon-box {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: var(--accent-light, rgba(255, 77, 0, 0.08));
          border: 1px solid var(--accent-border, rgba(255, 77, 0, 0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 6px auto 14px;
          flex-shrink: 0;
        }

        .ugm-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary, #0a0a0a);
          margin: 0 0 6px;
          line-height: 1.25;
          letter-spacing: -0.01em;
        }

        .ugm-subtitle {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--accent-color, #ff4d00);
          margin-bottom: 8px;
        }

        .ugm-desc {
          font-size: 0.82rem;
          color: var(--text-secondary, #666666);
          line-height: 1.5;
          margin: 0;
          max-width: 320px;
        }

        /* Guide Mode Items */
        .ugm-guide-list {
          width: 100%;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 6px;
        }

        .ugm-guide-card {
          background: var(--bg-page, #f7f7f7);
          border: 1px solid var(--border-color, #ebebeb);
          border-radius: 10px;
          padding: 10px 12px;
        }

        .ugm-guide-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary, #0a0a0a);
          margin-bottom: 4px;
        }

        .ugm-guide-card-text {
          font-size: 0.76rem;
          color: var(--text-secondary, #666666);
          line-height: 1.45;
        }

        /* Footer & Standard Small Buttons */
        .ugm-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px 16px;
          border-top: 1px solid var(--border-color, #f0f0f0);
          gap: 10px;
          flex-shrink: 0;
          background: var(--bg-card, #ffffff);
        }

        .ugm-btn-ghost {
          background: transparent;
          border: 1px solid var(--border-color, #e0e0e0);
          color: var(--text-secondary, #666666);
          font-size: 0.8rem;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
          line-height: 1.2;
        }

        .ugm-btn-ghost:hover {
          background: var(--bg-page, #f5f5f5);
          color: var(--text-primary, #0a0a0a);
          border-color: var(--border-hover, #ccc);
        }

        .ugm-btn-text {
          background: transparent;
          border: none;
          color: var(--text-muted, #888888);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 7px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s ease;
        }

        .ugm-btn-text:hover {
          color: var(--text-primary, #0a0a0a);
        }

        .ugm-btn-primary {
          background: var(--accent-color, #ff4d00);
          border: none;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 7px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(255, 77, 0, 0.25);
          transition: all 0.15s ease;
          line-height: 1.2;
        }

        .ugm-btn-primary:hover {
          background: var(--accent-hover, #e04400);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 77, 0, 0.35);
        }

        .ugm-btn-primary:active {
          transform: translateY(0);
        }

        /* Sub features list */
        .ugm-feature-box {
          width: 100%;
          background: var(--bg-page, #f8f8f8);
          border-radius: 10px;
          border: 1px solid var(--border-color, #ebebeb);
          padding: 10px 14px;
          margin-top: 12px;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ugm-feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-primary, #0a0a0a);
        }

        /* Odometer demo box */
        .ugm-odometer-box {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-page, #f8f8f8);
          border: 1px solid var(--border-color, #ebebeb);
          border-radius: 8px;
          padding: 8px 14px;
          margin: 12px 0 8px;
        }

        /* Responsive adjustments */
        @media (max-width: 400px) {
          .ugm-overlay {
            padding: 12px;
          }
          .ugm-dialog {
            border-radius: 16px;
          }
          .ugm-content {
            padding: 4px 14px 10px;
          }
          .ugm-footer {
            padding: 10px 14px 14px;
          }
        }
      `}</style>

      <div className="ugm-overlay" onClick={handleSkip}>
        <div
          className="ugm-dialog"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* ── Top Bar ── */}
          <div className="ugm-header">
            {currentMode === "onboarding" ? (
              <div className="ugm-step-pills">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`ugm-step-dot ${step === i + 1 ? "active" : ""}`}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <HelpCircle size={16} color="var(--accent-color, #ff4d00)" />
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    textTransform: "uppercase",
                  }}
                >
                  How NGINEBREAK Works
                </span>
              </div>
            )}

            <button
              onClick={currentMode === "onboarding" ? handleSkip : onClose}
              className="ugm-close-btn"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── ONBOARDING MODE ──────────────────────── */}
          {currentMode === "onboarding" && (
            <>
              <div className="ugm-content">
                {/* Step 1: Welcome */}
                {step === 1 && (
                  <>
                    <div className="ugm-icon-box">
                      <Sparkles size={26} color="var(--accent-color, #ff4d00)" />
                    </div>
                    <h3 className="ugm-title">Welcome to NGINEBREAK</h3>
                    <div className="ugm-subtitle">Your Vehicle. Your Story.</div>
                    <p className="ugm-desc">
                      Track your vehicle, stay on top of maintenance schedules,
                      and manage it together with your vehicle partners.
                    </p>
                  </>
                )}

                {/* Step 2: Add Vehicle */}
                {step === 2 && (
                  <>
                    <div className="ugm-icon-box">
                      <Car size={26} color="var(--accent-color, #ff4d00)" />
                    </div>
                    <h3 className="ugm-title">Add Your Vehicle</h3>
                    <div className="ugm-subtitle">Step 2 of {totalSteps}</div>
                    <p className="ugm-desc">
                      Add your vehicle details and enter its current odometer
                      reading to kickstart tracking.
                    </p>
                  </>
                )}

                {/* Step 3: Track Maintenance */}
                {step === 3 && (
                  <>
                    <div className="ugm-icon-box">
                      <Wrench size={26} color="var(--accent-color, #ff4d00)" />
                    </div>
                    <h3 className="ugm-title">Track Maintenance</h3>
                    <div className="ugm-subtitle">Step 3 of {totalSteps}</div>
                    <p className="ugm-desc">
                      Log services like Engine Oil, Brake Pads, and Filters.
                      NGINEBREAK calculates next due dates automatically based on
                      odometer readings and time.
                    </p>
                  </>
                )}

                {/* Step 4: Shared Garage */}
                {step === 4 && (
                  <>
                    <div className="ugm-icon-box">
                      <Users size={26} color="var(--accent-color, #ff4d00)" />
                    </div>
                    <h3 className="ugm-title">Shared Garage</h3>
                    <div className="ugm-subtitle">Step 4 of {totalSteps}</div>
                    <p className="ugm-desc">
                      Invite family or co-owners to keep the same vehicle up to date
                      in real-time.
                    </p>
                    <div className="ugm-feature-box">
                      <div className="ugm-feature-item">
                        <CheckCircle2 size={14} color="var(--accent-color, #ff4d00)" />
                        Shared maintenance logs
                      </div>
                      <div className="ugm-feature-item">
                        <CheckCircle2 size={14} color="var(--accent-color, #ff4d00)" />
                        Shared odometer updates
                      </div>
                      <div className="ugm-feature-item">
                        <CheckCircle2 size={14} color="var(--accent-color, #ff4d00)" />
                        Activity history per member
                      </div>
                    </div>
                  </>
                )}

                {/* Step 5: Keep Odometer Updated */}
                {step === 5 && (
                  <>
                    <div className="ugm-icon-box">
                      <Gauge size={26} color="var(--accent-color, #ff4d00)" />
                    </div>
                    <h3 className="ugm-title">Keep Odometer Updated</h3>
                    <div className="ugm-subtitle">Step 5 of {totalSteps}</div>
                    <p className="ugm-desc">
                      Enter latest readings from your vehicle to automatically
                      refresh all service intervals.
                    </p>

                    <div className="ugm-odometer-box">
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--text-muted, #888)",
                        }}
                      >
                        45,000 km
                      </span>
                      <ArrowRight size={13} color="var(--accent-color, #ff4d00)" />
                      <span
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 800,
                          color: "var(--text-primary, #0a0a0a)",
                        }}
                      >
                        45,700 km
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted, #888)",
                        marginTop: 2,
                      }}
                    >
                      History keeps full record of who updated what.
                    </span>
                  </>
                )}
              </div>

              {/* ── Sticky Standard Compact Footer ── */}
              <div className="ugm-footer">
                <div>
                  {step > 1 ? (
                    <button
                      className="ugm-btn-ghost"
                      onClick={() => setStep((s) => s - 1)}
                    >
                      <ChevronLeft size={14} /> Back
                    </button>
                  ) : (
                    <button className="ugm-btn-text" onClick={handleSkip}>
                      Skip Tour
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {step < totalSteps ? (
                    <button
                      className="ugm-btn-primary"
                      onClick={() => setStep((s) => s + 1)}
                    >
                      Next <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button className="ugm-btn-primary" onClick={handleFinish}>
                      Get Started
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── GUIDE MODE ───────────────────────────── */}
          {currentMode === "guide" && (
            <>
              <div className="ugm-content">
                <p
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--text-muted, #888)",
                    margin: "2px 0 10px",
                    lineHeight: 1.4,
                  }}
                >
                  Quick reference guide for NGINEBREAK features.
                </p>

                <div className="ugm-guide-list">
                  <div className="ugm-guide-card">
                    <div className="ugm-guide-card-head">
                      <Car size={14} color="var(--accent-color, #ff4d00)" />
                      Add a Vehicle
                    </div>
                    <div className="ugm-guide-card-text">
                      Enter vehicle details (Make, Model, Year, Type) and its
                      starting odometer reading.
                    </div>
                  </div>

                  <div className="ugm-guide-card">
                    <div className="ugm-guide-card-head">
                      <Wrench size={14} color="var(--accent-color, #ff4d00)" />
                      Maintenance
                    </div>
                    <div className="ugm-guide-card-text">
                      Add maintenance items and interval targets. Due alerts are
                      calculated automatically.
                    </div>
                  </div>

                  <div className="ugm-guide-card">
                    <div className="ugm-guide-card-head">
                      <Gauge size={14} color="var(--accent-color, #ff4d00)" />
                      Update Odometer
                    </div>
                    <div className="ugm-guide-card-text">
                      Update readings regularly to keep service schedules
                      accurate.
                    </div>
                  </div>

                  <div className="ugm-guide-card">
                    <div className="ugm-guide-card-head">
                      <Users size={14} color="var(--accent-color, #ff4d00)" />
                      Shared Garage
                    </div>
                    <div className="ugm-guide-card-text">
                      Invite vehicle partners to collaborate on maintenance
                      and logs together.
                    </div>
                  </div>

                  <div className="ugm-guide-card">
                    <div className="ugm-guide-card-head">
                      <Clock size={14} color="var(--accent-color, #ff4d00)" />
                      Odometer History
                    </div>
                    <div className="ugm-guide-card-text">
                      Every update is logged with user and date. Erroneous
                      updates can be safely reverted.
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Guide Footer ── */}
              <div className="ugm-footer">
                <button
                  className="ugm-btn-ghost"
                  onClick={() => {
                    setCurrentMode("onboarding");
                    setStep(1);
                  }}
                >
                  <RotateCcw size={12} /> Tour
                </button>

                <button className="ugm-btn-primary" onClick={onClose}>
                  Got It
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

=======
    <div
      className="modal-backdrop"
      onClick={handleSkip}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 1200,
      }}
    >
      <div
        className="user-guide-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          padding: "24px 20px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          {currentMode === "onboarding" ? (
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--accent-color)",
                background: "var(--accent-light)",
                padding: "3px 10px",
                borderRadius: 20,
                border: "1px solid var(--accent-border)",
                letterSpacing: "0.04em",
              }}
            >
              [ {step} / {totalSteps} ]
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HelpCircle size={18} color="var(--accent-color)" />
              <span
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                }}
              >
                HOW NGINEBREAK WORKS
              </span>
            </div>
          )}

          <button
            onClick={currentMode === "onboarding" ? handleSkip : onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={currentMode === "onboarding" ? "Skip Onboarding" : "Close"}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── ONBOARDING MODE SLIDES ───────────────────── */}
        {currentMode === "onboarding" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* SCREEN 1 */}
            {step === 1 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "12px 0 20px",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Sparkles size={36} color="var(--accent-color)" />
                </div>

                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    margin: "0 0 4px 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Welcome to NGINEBREAK
                </h2>
                <div
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "var(--accent-color)",
                    marginBottom: 16,
                  }}
                >
                  Your Vehicle. Your Story.
                </div>

                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                    maxWidth: 320,
                  }}
                >
                  Track your vehicle, stay on top of maintenance, and manage it
                  together with your vehicle partners.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    width: "100%",
                    marginTop: 32,
                  }}
                >
                  <button
                    onClick={handleSkip}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-page)",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                    }}
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="btn-orange"
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    Get Started <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 2 */}
            {step === 2 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "12px 0 20px",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Car size={38} color="var(--accent-color)" />
                </div>

                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    margin: "0 0 12px 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Add Your Vehicle
                </h2>

                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                    maxWidth: 320,
                  }}
                >
                  Add your vehicle and enter its current odometer reading.
                </p>

                <div
                  style={{
                    width: "100%",
                    marginTop: 32,
                  }}
                >
                  <button
                    onClick={() => setStep(3)}
                    className="btn-orange"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 3 */}
            {step === 3 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "12px 0 20px",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Wrench size={38} color="var(--accent-color)" />
                </div>

                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    margin: "0 0 12px 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Track Maintenance
                </h2>

                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                    maxWidth: 340,
                  }}
                >
                  Add services like Engine Oil, Air Filter, General Service,
                  Tyres and more. NGINEBREAK calculates when maintenance is
                  due based on your KM or time interval.
                </p>

                <div
                  style={{
                    width: "100%",
                    marginTop: 32,
                  }}
                >
                  <button
                    onClick={() => setStep(4)}
                    className="btn-orange"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 4 */}
            {step === 4 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "12px 0 20px",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Users size={38} color="var(--accent-color)" />
                </div>

                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    margin: "0 0 8px 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Share Your Garage
                </h2>

                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: "0 0 16px 0",
                    maxWidth: 340,
                  }}
                >
                  Invite your family, friends, or vehicle partners to maintain
                  the same vehicle together.
                </p>

                {/* Checklist box */}
                <div
                  style={{
                    width: "100%",
                    background: "var(--bg-page)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--accent-color)" />
                    Shared maintenance
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--accent-color)" />
                    Shared odometer
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--accent-color)" />
                    Shared history
                  </div>
                </div>

                <div
                  style={{
                    width: "100%",
                    marginTop: 24,
                  }}
                >
                  <button
                    onClick={() => setStep(5)}
                    className="btn-orange"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 5 */}
            {step === 5 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "12px 0 20px",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Gauge size={38} color="var(--accent-color)" />
                </div>

                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    margin: "0 0 8px 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Keep Your Odometer Updated
                </h2>

                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: "0 0 16px 0",
                    maxWidth: 340,
                  }}
                >
                  Enter the latest reading from your vehicle. Every update
                  automatically updates your maintenance calculations.
                </p>

                {/* Example Odometer badge */}
                <div
                  style={{
                    background: "var(--bg-page)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: "12px 20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.92rem",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                    }}
                  >
                    45,000 km
                  </span>
                  <ArrowRight size={16} color="var(--accent-color)" />
                  <span
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    45,700 km
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    margin: "0 0 20px 0",
                  }}
                >
                  Everyone in the shared garage can see who updated it.
                </p>

                <div
                  style={{
                    width: "100%",
                  }}
                >
                  <button
                    onClick={handleFinishOnboarding}
                    className="btn-orange"
                    style={{
                      width: "100%",
                      padding: "13px 16px",
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    Start Using NGINEBREAK
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GUIDE / HOW NGINEBREAK WORKS MODE ────────── */}
        {currentMode === "guide" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginBottom: 16,
              }}
            >
              Learn how to get the most out of NGINEBREAK core functions.
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {/* 1. Add a Vehicle */}
              <div
                style={{
                  background: "var(--bg-page)",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Car size={16} color="var(--accent-color)" /> Add a Vehicle
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  Enter your vehicle details (Make, Model, Year, Type) and its
                  starting odometer reading to initialize tracking.
                </div>
              </div>

              {/* 2. Maintenance */}
              <div
                style={{
                  background: "var(--bg-page)",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Wrench size={16} color="var(--accent-color)" /> Maintenance
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  Add a maintenance item such as Engine Oil and set its KM or
                  time interval. NGINEBREAK calculates the next due point
                  automatically.
                </div>
              </div>

              {/* 3. Update Odometer */}
              <div
                style={{
                  background: "var(--bg-page)",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Gauge size={16} color="var(--accent-color)" /> Update Odometer
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  Enter the latest reading from your vehicle. Every update
                  automatically updates your maintenance calculations.
                </div>
              </div>

              {/* 4. Shared Garage */}
              <div
                style={{
                  background: "var(--bg-page)",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Users size={16} color="var(--accent-color)" /> Shared Garage
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  Invite your vehicle partners so everyone can view and
                  maintain the same vehicle.
                </div>
              </div>

              {/* 5. Odometer History */}
              <div
                style={{
                  background: "var(--bg-page)",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Clock size={16} color="var(--accent-color)" /> Odometer History
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  Every odometer update is saved with the user and date.
                  Incorrect updates can be rewound without permanently deleting
                  the history.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: "auto",
              }}
            >
              <button
                onClick={() => {
                  setCurrentMode("onboarding");
                  setStep(1);
                }}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-page)",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <RotateCcw size={14} /> Replay Product Tour
              </button>
              <button
                onClick={onClose}
                className="btn-orange"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                }}
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
>>>>>>> 44a1432e292ae34961120febd5fcd58e02253a79
