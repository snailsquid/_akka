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

export function getAdminCredentials(): { username: string; password: string } | null {
  try {
    const fs = await import("fs");
    const envContent = await fs.readFile(".env", "utf-8");
    const lines = envContent.split("\n");
    const credentials: Record<string, string> = {};
    
    for (const line of lines) {
      const match = line.trim().match(/^ADMIN_(USERNAME|PASSWORD)=([^\s]+)$/);
      if (match) {
        credentials[match[1]] = match[2];
      }
    }
    
    if (credentials.username && credentials.password) {
      return credentials;
    }
    return null;
  } catch {
    return null;
  }
}