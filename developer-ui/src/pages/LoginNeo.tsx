import { useState, useContext } from "react";
import { AuthContext } from "../App";

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Please enter a token");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/developer/sessions", {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      onLogin(token.trim());
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">AKKA</div>
        <h1>Developer Portal</h1>
        <p className="subtitle">
          Enter your authentication token to access the developer dashboard.
        </p>

        {error && <div className="error-message">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Authentication Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your token"
              required
            />
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", fontWeight: 700, opacity: 0.7 }}>
              Get your token by sending <code>.login</code> via WhatsApp
            </p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
