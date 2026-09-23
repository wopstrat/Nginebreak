import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, ChevronLeft, Trash2, CheckCircle2, AlertTriangle, Clock, Gauge, Flame, Info } from 'lucide-react';
import { STATUS, getDualPillComparison, calculatePartLifePercent } from '../services/CalculationEngine';
import { useGarage } from '../context/GarageContext';

export default function DualPillModal({ mod, vehicle, onClose, onServiceCompleted }) {
  const { completeService, deleteMaintenanceModule } = useGarage();
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [completedOdo, setCompletedOdo] = useState(vehicle?.current_odometer || 0);
  const [completedDate, setCompletedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!mod || !vehicle) return null;

  const currentOdo = vehicle.current_odometer || 0;
  const comparison = getDualPillComparison(mod, currentOdo);
  const lifePercent = calculatePartLifePercent(mod, currentOdo);

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await completeService(vehicle.id, mod.id, parseInt(completedOdo), completedDate);
      if (onServiceCompleted) onServiceCompleted();
      onClose();
    } catch (err) {
      alert("Error completing service: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async () => {
    setDeleting(true);
    try {
      await deleteMaintenanceModule(vehicle.id, mod.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      alert("Error deleting service: " + (err.message || err));
      setDeleting(false);
    }
  };

  const getPartEmoji = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('oil')) return '🛢️';
    if (lower.includes('brake')) return '🛑';
    if (lower.includes('filter')) return '💨';
    if (lower.includes('coolant')) return '🧪';
    if (lower.includes('tyre') || lower.includes('tire')) return '🛞';
    if (lower.includes('battery')) return '⚡';
    if (lower.includes('spark')) return '⚡';
    if (lower.includes('chain') || lower.includes('belt')) return '⚙️';
    return '🔧';
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="dual-pill-modal"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: 24,
          width: '100%',
          maxWidth: 440,
          padding: '24px 20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid var(--border-color)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 8
            }}
          >
            <ChevronLeft size={22} />
          </button>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', textAlign: 'center', flex: 1, padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mod.name}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete service"
              aria-label="Delete service"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--danger-color, #ef4444)';
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={19} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-page)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div 
            className="modal-backdrop" 
            onClick={() => !deleting && setShowDeleteConfirm(false)} 
            style={{ zIndex: 1300, background: 'rgba(0, 0, 0, 0.7)' }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 20,
                width: '100%',
                maxWidth: 360,
                padding: '24px 20px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.3)',
                textAlign: 'center',
                animation: 'modalFadeIn 0.15s ease both'
              }}
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger-color, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <Trash2 size={24} />
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Delete Service?
              </h4>

              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 20px' }}>
                Are you sure you want to delete <strong>{mod.name}</strong>? This will permanently remove this maintenance schedule from your vehicle.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteService}
                  className="btn-danger"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Part Title Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(249,115,22,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            {getPartEmoji(mod.name)}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {mod.name}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Every {mod.interval_km ? `${mod.interval_km.toLocaleString()} km` : ''} 
              {mod.interval_km && mod.interval_months ? ' or ' : ''}
              {mod.interval_months ? `${mod.interval_months} months` : ''}
            </div>
          </div>
        </div>

        {/* Dual Pills (Whichever Comes First) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          {/* KM Pill */}
          <div 
            style={{
              borderRadius: 16,
              padding: '14px 12px',
              background: comparison?.expiresFirst === 'km' || comparison?.expiresFirst === 'both' 
                ? (comparison?.remainingKm <= 0 ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)')
                : 'var(--bg-secondary, rgba(255,255,255,0.04))',
              border: comparison?.expiresFirst === 'km' || comparison?.expiresFirst === 'both'
                ? (comparison?.remainingKm <= 0 ? '1.5px solid var(--danger-color)' : '1.5px solid var(--accent-color)')
                : '1px solid var(--border-color)',
              position: 'relative',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4
            }}
          >
            {comparison?.expiresFirst === 'km' && (
              <span className="expires-first-badge" style={{
                position: 'absolute',
                top: -10,
                background: comparison?.remainingKm <= 0 ? 'var(--danger-color)' : 'var(--accent-color)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 12,
                letterSpacing: '0.02em',
                boxShadow: '0 2px 6px rgba(249,115,22,0.3)'
              }}>
                Expires First
              </span>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Gauge size={13} /> Distance
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
              {mod.remaining_km !== null
                ? mod.remaining_km <= 0
                  ? `${Math.abs(mod.remaining_km).toLocaleString()} km overdue`
                  : `${mod.remaining_km.toLocaleString()} km left`
                : 'N/A'}
            </div>
          </div>

          {/* Time Pill */}
          <div 
            style={{
              borderRadius: 16,
              padding: '14px 12px',
              background: comparison?.expiresFirst === 'time' || comparison?.expiresFirst === 'both' 
                ? (comparison?.remainingDays <= 0 ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)')
                : 'var(--bg-secondary, rgba(255,255,255,0.04))',
              border: comparison?.expiresFirst === 'time' || comparison?.expiresFirst === 'both'
                ? (comparison?.remainingDays <= 0 ? '1.5px solid var(--danger-color)' : '1.5px solid var(--accent-color)')
                : '1px solid var(--border-color)',
              position: 'relative',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4
            }}
          >
            {comparison?.expiresFirst === 'time' && (
              <span className="expires-first-badge" style={{
                position: 'absolute',
                top: -10,
                background: comparison?.remainingDays <= 0 ? 'var(--danger-color)' : 'var(--accent-color)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 12,
                letterSpacing: '0.02em',
                boxShadow: '0 2px 6px rgba(249,115,22,0.3)'
              }}>
                Expires First 🔥
              </span>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} /> Time
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
              {mod.remaining_days !== null
                ? mod.remaining_days <= 0
                  ? `${Math.abs(mod.remaining_days)} days overdue`
                  : `${mod.remaining_days} Days left`
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Explanatory Callout */}
        {comparison?.explanation && (
          <div style={{
            background: 'rgba(59,130,246,0.07)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 14,
            padding: '12px 14px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            fontSize: '0.82rem',
            color: 'var(--text-primary)',
            lineHeight: 1.45
          }}>
            <Info size={18} style={{ color: 'var(--info-color)', flexShrink: 0, marginTop: 1 }} />
            <div>
              {comparison.explanation}
            </div>
          </div>
        )}

        {/* Metadata Details List */}
        <div style={{
          background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
          borderRadius: 16,
          padding: '14px 16px',
          marginBottom: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontSize: '0.84rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Completed</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {mod.last_service_date ? format(new Date(mod.last_service_date), 'dd MMM yyyy') : 'Never'}
              {mod.last_service_km ? ` (${mod.last_service_km.toLocaleString()} km)` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Next Due</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
              {mod.next_due_km ? `${mod.next_due_km.toLocaleString()} km` : ''}
              {mod.next_due_km && mod.next_due_date ? ' or ' : ''}
              {mod.next_due_date ? format(new Date(mod.next_due_date), 'dd MMM yyyy') : ''}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Current Odometer</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentOdo.toLocaleString()} km
            </span>
          </div>
        </div>

        {/* Complete Form or CTA Button */}
        {showCompleteForm ? (
          <form onSubmit={handleCompleteSubmit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-primary)' }}>Log Completed Service</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>Odometer (km)</label>
                <input
                  type="number"
                  className="form-control"
                  value={completedOdo}
                  onChange={e => setCompletedOdo(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={completedDate}
                  onChange={e => setCompletedDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={saving}
                className="btn-orange"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {saving ? 'Saving...' : '✓ Confirm Completed'}
              </button>
              <button
                type="button"
                onClick={() => setShowCompleteForm(false)}
                className="btn-secondary"
                style={{ padding: '0 14px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn-orange"
            onClick={() => setShowCompleteForm(true)}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px 20px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 14,
              boxShadow: '0 4px 14px rgba(249,115,22,0.3)'
            }}
          >
            Mark as Completed
          </button>
        )}
      </div>
    </div>
  );
}
