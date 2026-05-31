// Auth utility for localStorage token management

const AUTH_TOKEN_KEY = "akka_admin_token";

export function getAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
	if (typeof window !== "undefined") {
		localStorage.setItem(AUTH_TOKEN_KEY, token);
	}
}

export function removeAuthToken(): void {
	if (typeof window !== "undefined") {
		localStorage.removeItem(AUTH_TOKEN_KEY);
	}
}

export function isAuthenticated(): boolean {
	return !!getAuthToken();
}

export function getAdminCredentials(): {
	username: string;
	password: string;
} | null {
	try {
		// Use Vite's import.meta.env for build-time env injection
		const username = import.meta.env.VITE_ADMIN_USERNAME;
		const password = import.meta.env.VITE_ADMIN_PASSWORD;
		if (username && password) {
			return { username, password };
		}
		return null;
	} catch {
		return null;
	}
}
