import { useState, useContext } from "react";
import { AuthContext } from "../App";
import { apiFetch } from "../lib/api";
import { getAdminCredentials } from "../lib/auth";

export default function LoginPage({
	onLogin,
}: {
	onLogin: (token: string) => void;
}) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [autoFill, setAutoFill] = useState(false);
	const { login } = useContext(AuthContext)!;

	const handleLogin = async () => {
		// Try to get credentials from .env first
		const credentials = await getAdminCredentials();
		if (credentials) {
			setUsername(credentials.username);
			setPassword(credentials.password);
			setAutoFill(true);
		}

		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const data = await apiFetch("/admin/login", {
				method: "POST",
				body: JSON.stringify({ username, password }),
			});
			login(data.token);
			onLogin(data.token);
		} catch (err: any) {
			setError(err.message || "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-container">
			<div className="login-card">
				<div className="logo">⚡</div>
				<h1>Admin Dashboard</h1>
				<p className="subtitle">Sign in to manage WhatsApp sessions</p>

				{error && <div className="error-message">{error}</div>}

				<form onSubmit={handleLogin}>
					<div className="form-group">
						<label>Username</label>
						<input
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="Enter username"
							required
							disabled={loading}
						/>
					</div>
					<div className="form-group">
						<label>Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Enter password"
							required
							disabled={loading}
						/>
					</div>
					<button type="submit" className="btn btn-primary" disabled={loading}>
						{loading ? "Signing in..." : "Sign In"}
					</button>
					{autoFill && (
						<div className="auto-fill-info">
							<p>✓ Auto-filled with default credentials</p>
							<p className="small">Default: admin / admin</p>
							<button
								type="button"
								onClick={() => setAutoFill(false)}
								className="btn btn-secondary btn-sm"
							>
								Use custom credentials
							</button>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}
