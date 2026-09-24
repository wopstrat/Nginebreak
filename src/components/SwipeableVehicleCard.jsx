import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import { calculatePartLifePercent } from "../services/CalculationEngine";
import {
  Trash2,
  Users,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  MoreVertical
} from "lucide-react";
import "./SwipeableVehicleCard.css";

const STUCK_OFFSET = 160;
const SWIPE_THRESHOLD = 50;

export default function SwipeableVehicleCard({ vehicle }) {
  const { deleteVehicle } = useGarage();
  const navigate = useNavigate();

  // ── State ──
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  // ── Refs ──
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const maxDeltaX = useRef(0);
  const isHorizRef = useRef(false);
  const draggingRef = useRef(false);
  const wrapperRef = useRef(null);

  // ── Calculation helpers ──
  const getVehicleStats = (veh) => {
    if (!veh) return { overdue: 0, dueSoon: 0, total: 0 };
    const mods = veh.maintenance_modules || [];
    let overdue = 0;
    let dueSoon = 0;

    mods.forEach((m) => {
      const life = calculatePartLifePercent(m, veh.current_odometer);
      if (life <= 0 || (m.remaining_km !== null && m.remaining_km <= 0)) {
        overdue++;
      } else if (life <= 20 || (m.remaining_km !== null && m.remaining_km <= 300)) {
        dueSoon++;
      }
    });

    return { overdue, dueSoon, total: mods.length };
  };

  const stats = getVehicleStats(vehicle);
  const membersCount = (vehicle?.members?.length || 0) + 1;

  const closeCard = () => {
    setOffsetX(0);
    setIsStuck(false);
    draggingRef.current = false;
    setIsDragging(false);
  };

  /* ---- MOUSE DRAG ---- */
  const onMouseDown = (e) => {
    if (
      e.target.closest("a") ||
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest(".vehicle-menu-dropdown")
    )
      return;
    if (isStuck) {
      closeCard();
      return;
    }

    draggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    maxDeltaX.current = 0;
    isHorizRef.current = false;
    maxDeltaX.current = 0;
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return;
    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    if (!isHorizRef.current) {
      if (Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
        isHorizRef.current = true;
      } else if (Math.abs(diffY) > 6) {
        draggingRef.current = false;
        setIsDragging(false);
        return;
      }
    }
    if (!isHorizRef.current) return;

    let clamped = diffX;
    if (Math.abs(diffX) > STUCK_OFFSET) {
      const extra = Math.abs(diffX) - STUCK_OFFSET;
      clamped = Math.sign(diffX) * (STUCK_OFFSET + extra * 0.25);
    }
    setOffsetX(Math.max(-200, Math.min(200, clamped)));
  };

  const onMouseUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);

    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      const target = offsetX > 0 ? STUCK_OFFSET : -STUCK_OFFSET;
      setOffsetX(target);
      setIsStuck(true);
    } else {
      closeCard();
    }
  };

  /* ---- TOUCH SWIPE ---- */
  const onTouchStart = (e) => {
    if (
      e.target.closest("a") ||
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest(".vehicle-menu-dropdown")
    )
      return;

    // If card is stuck (delete revealed), tap to close it
    if (isStuck) {
      closeCard();
      return;
    }

    draggingRef.current = false;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    maxDeltaX.current = 0;
    isHorizRef.current = false;
  };

  const onTouchMove = (e) => {
    const diffX = e.touches[0].clientX - startXRef.current;
    const diffY = e.touches[0].clientY - startYRef.current;

    if (!isHorizRef.current) {
      if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
        isHorizRef.current = true;
        draggingRef.current = true;
        setIsDragging(true);
      } else if (Math.abs(diffY) > 10) {
        return;
      } else {
        return;
      }
    }

    if (!draggingRef.current) return;
    if (e.cancelable) e.preventDefault();

    let clamped = diffX;
    if (Math.abs(diffX) > STUCK_OFFSET) {
      const extra = Math.abs(diffX) - STUCK_OFFSET;
      clamped = Math.sign(diffX) * (STUCK_OFFSET + extra * 0.25);
    }
    setOffsetX(Math.max(-200, Math.min(200, clamped)));
  };

  const onTouchEnd = () => {
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    setIsDragging(false);

    if (!wasDragging) return;

    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      setOffsetX(offsetX > 0 ? STUCK_OFFSET : -STUCK_OFFSET);
      setIsStuck(true);
    } else {
      closeCard();
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowModal(true);
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    setShowModal(false);
    const wrapper = wrapperRef.current;
    if (wrapper) wrapper.style.maxHeight = wrapper.offsetHeight + "px";
    setIsDeleting(true);
    setTimeout(async () => {
      try {
        await deleteVehicle(vehicle.id);
      } catch (err) {
        console.error("[SwipeableVehicleCard] delete failed:", err);
        if (wrapper) wrapper.style.maxHeight = "";
        setIsDeleting(false);
      }
    }, 380);
  };

  const handleCardClick = (e) => {
    if (isStuck) {
      closeCard();
      return;
    }
    if (Math.abs(offsetX) > 5) return;
    navigate(`/vehicle/${vehicle.id}`);
  };

  const imgSrc =
    vehicle.photo_url ||
    (vehicle.media && vehicle.media[0]?.url) ||
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=300&q=80";

  return (
    <>
      <div
        ref={wrapperRef}
        className={`swipe-delete-wrapper ${isDeleting ? "deleting" : ""}`}
        style={{ marginBottom: 12 }}
      >
        {/* Back Layer Delete (revealed on swipe left or right) */}
        <div className="swipe-delete-back" onClick={handleDeleteClick}>
          {/* Left Delete Button (when swiping right) */}
          <div
            className="delete-center-module"
            style={{
              position: "absolute",
              left: 46,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: offsetX > 20 ? 1 : 0,
              transition: "opacity 0.2s ease"
            }}
            onClick={handleDeleteClick}
            role="button"
            tabIndex={0}
            title="Delete vehicle"
          >
            <div className="delete-logo-btn">
              <Trash2 size={17} />
            </div>
            <span className="delete-logo-label">Delete</span>
          </div>

          {/* Right Delete Button (when swiping left) */}
          <div
            className="delete-center-module"
            style={{
              position: "absolute",
              right: 46,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: offsetX < -20 ? 1 : 0,
              transition: "opacity 0.2s ease"
            }}
            onClick={handleDeleteClick}
            role="button"
            tabIndex={0}
            title="Delete vehicle"
          >
            <div className="delete-logo-btn">
              <Trash2 size={17} />
            </div>
            <span className="delete-logo-label">Delete</span>
          </div>
        </div>

        {/* Front Layer Card */}
        <div
          className={`vehicle-dashboard-card swipe-delete-front ${isDragging ? "dragging" : ""} ${isStuck ? "stuck" : ""}`}
          onClick={handleCardClick}
          style={{
            transform: `translateX(${offsetX}px)`,
            marginBottom: 0,
            background: "var(--bg-card)",
            borderRadius: 18,
            padding: "12px 14px",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--card-shadow, 0 2px 10px rgba(0,0,0,0.03))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            cursor: "pointer",
            transition: isDragging
              ? "none"
              : "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.25s ease",
            position: "relative",
            zIndex: 2,
            userSelect: "none",
            WebkitUserSelect: "none"
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Left: Dedicated Framed Vehicle Image */}
          <div
            style={{
              width: 76,
              height: 54,
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--bg-secondary, rgba(0,0,0,0.04))",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              position: "relative"
            }}
          >
            {!imgError ? (
              <img
                src={imgSrc}
                alt={vehicle.model}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center"
                }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  background: "rgba(249,115,22,0.08)"
                }}
              >
                🚗
              </div>
            )}
          </div>

          {/* Middle: Name, Year • Type, Shared badge */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <h3
              style={{
                fontSize: "0.98rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.25
              }}
            >
              {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
            </h3>
            <div
              style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2
              }}
            >
              {vehicle.year} &bull; {vehicle.type || vehicle.fuel_type || "Car"}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#059669",
                borderRadius: 12,
                padding: "3px 8px",
                fontSize: "0.68rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                width: "fit-content"
              }}
            >
              <Users size={11} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap" }}>
                Shared &bull; {membersCount} Member{membersCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Right: Status Pill + 3-dots menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {stats.overdue > 0 ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap"
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{stats.overdue} Overdue</span>
              </div>
            ) : stats.dueSoon > 0 ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#f59e0b",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap"
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{stats.dueSoon} Due Soon</span>
              </div>
            ) : (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#10b981",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap"
                }}
              >
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                <span>All Good</span>
              </div>
            )}

            {/* 3-Dots Menu Button */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((s) => !s);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Options"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div
                  className="vehicle-menu-dropdown"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 28,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: "6px 0",
                    minWidth: 150,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                    zIndex: 100
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      navigate(`/vehicle/${vehicle.id}`);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 14px",
                      color: "var(--text-primary)",
                      fontSize: "0.82rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <ChevronRight size={14} /> View Details
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 14px",
                      color: "var(--danger-color, #ef4444)",
                      fontSize: "0.82rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={14} /> Delete Vehicle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="delete-modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 2000 }}>
          <div className="delete-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <Trash2 size={26} />
            </div>
            <h3 className="delete-modal-title">Delete Vehicle</h3>
            <p className="delete-modal-desc">
              Are you sure you want to delete <strong>{vehicle.make} {vehicle.model}</strong>? This will permanently remove all maintenance records and history.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-danger"
                style={{ flex: 1, justifyContent: "center", padding: "10px 16px", borderRadius: 12, fontWeight: 700 }}
                onClick={confirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, justifyContent: "center", padding: "10px 16px", borderRadius: 12, fontWeight: 600 }}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
