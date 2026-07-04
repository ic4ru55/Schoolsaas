"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { login, AuthUser } from "../lib/api";

type LoginPageProps = {
  onLoginSuccess: (user: AuthUser, token: string) => void;
};

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await login(email, password);
      localStorage.setItem("schoolsaas_token", res.accessToken);
      onLoginSuccess(res.user, res.accessToken);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon-wrap">
            <ShieldCheck size={36} className="logo-color" />
          </div>
          <h1>SchoolSaaS BF</h1>
          <p>Système de gestion scolaire et universitaire</p>
        </div>

        {error && <div className="login-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="admin@schoolsaas.bf"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-submit-button" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <div className="login-footer">
          <small>© 2026 SchoolSaaS BF. Tous droits réservés.</small>
        </div>
      </div>

      <style jsx global>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%);
          padding: 20px;
          font-family: 'Inter', sans-serif;
          color: #f1f5f9;
        }

        .login-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          margin-bottom: 16px;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .logo-color {
          color: #818cf8;
        }

        .login-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(to right, #ffffff, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-header p {
          color: #94a3b8;
          font-size: 14px;
        }

        .login-error-alert {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px;
          color: #f87171;
          font-size: 13.5px;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .login-form .form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .login-form label {
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
        }

        .login-form input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px 14px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.2s;
        }

        .login-form input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
          background: rgba(15, 23, 42, 0.8);
        }

        .login-submit-button {
          width: 100%;
          background: #4f46e5;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
        }

        .login-submit-button:hover:not(:disabled) {
          background: #4338ca;
        }

        .login-submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          text-align: center;
          margin-top: 30px;
          color: #64748b;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
