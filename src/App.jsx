import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GarageProvider } from "./context/GarageContext";
import AuthGuard from "./components/AuthGuard";
import AdminGuard from "./components/AdminGuard";
import BottomNav from "./components/BottomNav";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import GarageDashboard from "./pages/GarageDashboard";
import Vehicles from "./pages/Vehicles";
import AddVehicle from "./pages/AddVehicle";
import VehicleProfile from "./pages/VehicleProfile";
import AddMaintenance from "./pages/AddMaintenance";
import ServiceHistory from "./pages/ServiceHistory";
import OdometerHistory from "./pages/OdometerHistory";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  return (
    <GarageProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes (no auth required) ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ── Protected routes ────────────────── */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <div className="nav-layout">
                  <BottomNav />
                  <div className="main-content">
                    <Routes>
                      <Route path="/" element={<GarageDashboard />} />
                      <Route path="/vehicles" element={<Vehicles />} />
                      <Route path="/add-vehicle" element={<AddVehicle />} />
                      <Route path="/vehicle/:id" element={<VehicleProfile />} />
                      <Route path="/vehicle/:vehicleId/add-maintenance" element={<AddMaintenance />} />
                      <Route path="/history" element={<ServiceHistory />} />
                      <Route path="/odometer-history/:vehicleId" element={<OdometerHistory />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/admin" element={<AdminGuard><AdminPanel /></AdminGuard>} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </div>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </GarageProvider>
  );
}
