import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../App";
import { apiFetch } from "../lib/api";

type LoginStep = "loading" | "waiting" | "awaiting_username" | "expired";

export default function LoginPage({
	onLogin,
}: {
	onLogin: (token: string) => void;
}) {
	const [step, setStep] = useState<LoginStep>("loading");
	const [error, setError] = useState("");
	const [authToken, setAuthToken] = useState("");
	const [waUrl, setWaUrl] = useState("");
	const [waPhone, setWaPhone] = useState("");
	const { login } = useContext(AuthContext)!;
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const initRef = useRef(false);

	const startPolling = (token: string) => {
		if (pollingRef.current) clearInterval(pollingRef.current);

		pollingRef.current = setInterval(async () => {
			try {
				const data = await apiFetch(
					`/developer/auth/status?token=${encodeURIComponent(token)}`,
				);

				if (data.status === "complete" && data.sessionToken) {
					if (pollingRef.current) clearInterval(pollingRef.current);
					login(data.sessionToken);
					onLogin(data.sessionToken);
				} else if (data.status === "expired") {
					if (pollingRef.current) clearInterval(pollingRef.current);
					setStep("expired");
				} else if (data.status === "awaiting_username") {
					setStep("awaiting_username");
				}
				// "pending" — keep polling
			} catch {
				// Network error — keep polling
			}
		}, 2000);
	};

	// Initialize: get token immediately on mount
	useEffect(() => {
		if (initRef.current) return;
		initRef.current = true;

		const initAuth = async () => {
			try {
				const data = await apiFetch("/developer/auth/init", {
					method: "POST",
					body: JSON.stringify({}),
				});

				if (data.error) {
					setError(data.error);
					return;
				}

				setAuthToken(data.token);
				setWaUrl(data.waUrl);
				setWaPhone(data.phone);
				setStep("waiting");
				startPolling(data.token);
			} catch (err: unknown) {
				const msg =
					err instanceof Error ? err.message : "Failed to initialize login";
				setError(msg);
			}
		};

		initAuth();

		return () => {
			if (pollingRef.current) clearInterval(pollingRef.current);
		};
	}, []);

	const handleRetry = () => {
		setStep("loading");
		setAuthToken("");
		setWaUrl("");
		setWaPhone("");
		setError("");
		initRef.current = false;
		window.location.reload();
	};

	return (
		<div className="login-container">
			<div className="login-card">
				<div className="logo">🛠️</div>
				<h1>DEVELOPER DASHBOARD</h1>
				<p className="subtitle">Register and manage your WhatsApp commands</p>

				{error && <div className="error-message">{error}</div>}

				{step === "loading" && (
					<div style={{ textAlign: "center", padding: "2rem" }}>
						<div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
						<p style={{ fontWeight: 700, fontSize: "1.125rem" }}>
							Generating your login code...
						</p>
					</div>
				)}

				{step === "waiting" && (
					<div style={{ textAlign: "center" }}>
						<div style={{ marginBottom: "2rem" }}>
							<div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📱</div>
							<h2
								style={{
									margin: 0,
									fontSize: "1.5rem",
									fontWeight: 900,
									textTransform: "uppercase",
								}}
							>
								Send login code from WhatsApp
							</h2>
							<p
								style={{
									fontWeight: 700,
									marginTop: "0.75rem",
									fontSize: "1rem",
								}}
							>
								Send the code below from your WhatsApp to verify your number.
							</p>
						</div>

						<a
							href={waUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="btn btn-primary"
							style={{
								display: "inline-flex",
								textDecoration: "none",
								marginBottom: "2rem",
							}}
						>
							OPEN WHATSAPP
						</a>

						<div
							style={{
								background: "var(--neo-muted)",
								border: "var(--border-4)",
								padding: "1.5rem",
								marginTop: "1rem",
								textAlign: "left",
								boxShadow: "var(--shadow-sm)",
							}}
						>
							<p
								style={{
									margin: "0 0 1rem 0",
									fontSize: "0.875rem",
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Can't open the link? Send this code to {waPhone} on WhatsApp:
							</p>
							<code
								style={{
									display: "block",
									padding: "1rem",
									background: "var(--neo-white)",
									border: "var(--border-2)",
									fontSize: "1.5rem",
									fontWeight: 900,
									textAlign: "center",
									letterSpacing: "0.2em",
									userSelect: "all",
								}}
							>
								.login {authToken}
							</code>
						</div>

						<div style={{ marginTop: "1.5rem" }}>
							<p
								style={{
									fontSize: "0.75rem",
									fontWeight: 700,
									opacity: 0.7,
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Code expires in 10 minutes. This page will update automatically.
							</p>
						</div>
					</div>
				)}

				{step === "awaiting_username" && (
					<div style={{ textAlign: "center" }}>
						<div style={{ marginBottom: "2rem" }}>
							<div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✍️</div>
							<h2
								style={{
									margin: 0,
									fontSize: "1.5rem",
									fontWeight: 900,
									textTransform: "uppercase",
								}}
							>
								Choose your username
							</h2>
							<p
								style={{
									fontWeight: 700,
									marginTop: "0.75rem",
									fontSize: "1rem",
								}}
							>
								Reply with your desired username on WhatsApp to complete
								registration.
							</p>
						</div>

						<div
							style={{
								background: "var(--neo-muted)",
								border: "var(--border-4)",
								padding: "1.5rem",
								marginTop: "1rem",
								boxShadow: "var(--shadow-sm)",
							}}
						>
							<p
								style={{
									margin: 0,
									fontSize: "0.875rem",
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Check your WhatsApp messages from {waPhone} and reply with your
								username.
							</p>
						</div>

						<div style={{ marginTop: "1.5rem" }}>
							<p
								style={{
									fontSize: "0.75rem",
									fontWeight: 700,
									opacity: 0.7,
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								This page will update automatically when you complete
								registration.
							</p>
						</div>
					</div>
				)}

				{step === "expired" && (
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏰</div>
						<h2
							style={{
								margin: 0,
								fontSize: "1.5rem",
								fontWeight: 900,
								textTransform: "uppercase",
							}}
						>
							Code expired
						</h2>
						<p
							style={{
								fontWeight: 700,
								marginTop: "0.75rem",
								fontSize: "1rem",
							}}
						>
							Your login code has expired. Please generate a new one.
						</p>
						<button
							className="btn btn-secondary"
							onClick={handleRetry}
							style={{ marginTop: "1.5rem" }}
						>
							GENERATE NEW CODE
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
