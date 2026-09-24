import React from "react";
import { Navigate } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import { Lock } from "lucide-react";

/**
 * AdminGuard — wraps the /admin route.
 *
 * Blocks access at the ROUTER level — does not rely solely on the
 * AdminPanel's internal check. Defence-in-depth: even if someone
 * guesses the /admin URL while logged in, they are immediately
 * redirected away unless they are a verified real admin.
 *
 * While auth is still resolving (authLoading) we show nothing to
 * avoid a flash of either the panel or a premature redirect.
 */
export default function AdminGuard({ children }) {
  const { currentUser, authLoading, isRealAdminUser } = useGarage();

  // Still resolving auth session — render nothing to prevent flash
  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-page)",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--border-color)",
            borderTop: "3px solid var(--accent-color)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 500 }}>
          Verifying access…
        </div>
      </div>
    );
  }

  // Not logged in → go to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but NOT an admin → go home (no leaking that /admin exists)
  if (!isRealAdminUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
