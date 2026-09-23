import React from 'react';
import { Link } from 'react-router-dom';
import { useGarage } from '../context/GarageContext';
import { Plus } from 'lucide-react';
import SwipeableVehicleCard from '../components/SwipeableVehicleCard';

export default function Vehicles() {
  const { vehicles } = useGarage();

  return (
    <div className="app-container" style={{ paddingTop: 0 }}>
      {/* Page header */}
      <div className="page-header">
        <div className="breadcrumb-nav">
          <Link to="/">Home</Link>
          <span className="sep">›</span>
          <span className="current">Vehicles</span>
        </div>
        <h1 className="page-title">All Vehicles</h1>
      </div>

      {vehicles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚗</div>
          <h5>No vehicles yet</h5>
          <p>Add your first vehicle to get started.</p>
          <Link to="/add-vehicle" className="btn-orange">
            <Plus size={16} /> Add Vehicle
          </Link>
        </div>
      ) : (
        <>
          {vehicles.map(v => (
            <SwipeableVehicleCard key={v.id} vehicle={v} />
          ))}

          <Link
            to="/add-vehicle"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '11px', borderRadius: 12, marginTop: 4,
              border: '1.5px dashed var(--accent-border)',
              color: 'var(--accent-color)', fontSize: '0.875rem', fontWeight: 600,
              background: 'var(--accent-light)'
            }}
          >
            <Plus size={16} /> Add Vehicle
          </Link>
        </>
      )}
    </div>
  );
}
