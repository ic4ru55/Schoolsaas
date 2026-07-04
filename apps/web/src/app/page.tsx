"use client";

import { useEffect, useState } from "react";
import { LoginPage } from "../components/login-page";
import { getMe, AuthUser } from "../lib/api";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const SchoolDashboard = dynamic(
  () => import("../components/school-dashboard").then((mod) => mod.SchoolDashboard),
  { ssr: false }
);

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("schoolsaas_token");
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        // En cas d'erreur de token expiré ou invalide, on le retire
        localStorage.removeItem("schoolsaas_token");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLoginSuccess = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("schoolsaas_token");
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#ffffff",
        fontFamily: "Inter, sans-serif"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Loader2 style={{ animation: "spin 1s linear infinite" }} size={32} />
          <span>Chargement du profil...</span>
        </div>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Passer l'utilisateur et le callback logout au tableau de bord
  return <SchoolDashboard currentUser={user} onLogout={handleLogout} />;
}
