import React, { useState } from "react";
import {
  Car,
  Wrench,
  Users,
  Gauge,
  Clock,
  CheckCircle2,
  X,
  ChevronRight,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

/**
 * UserGuideModal Component
 * Supports 2 modes:
 * 1) mode="onboarding" — 5-Screen First-Time User Tour
 * 2) mode="guide" — "HOW NGINEBREAK WORKS" Manual / User Guide
 */
export default function UserGuideModal({
  mode = "onboarding",
  onClose,
  onComplete,
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [step, setStep] = useState(1);

  const totalSteps = 5;

  const handleSkip = () => {
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  const handleFinishOnboarding = () => {
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  return (
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
