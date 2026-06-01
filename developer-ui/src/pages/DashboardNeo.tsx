import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";
import { apiFetch } from "../lib/api";
import { GitHub, RefreshCw, Trash2, Plus, ExternalLink } from "lucide-react";

interface Repository {
  repoUrl: string;
  commands: any[];
  manifestVersion: string | null;
}

export default function DashboardPage() {
  const { token, logout } = useContext(AuthContext)!;
  const [repos, setRepos] = useState<Repository[]>([]);
  const [activeTab, setActiveTab] = useState("repos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [addingRepo, setAddingRepo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const reposData = await apiFetch("/developer/repos");
      setRepos(reposData.repos || []);
      setError("");
    } catch (err: any) {
      if (err.message === "Unauthorized") {
        logout();
        navigate("/login");
      } else {
        setError(err.message || "Failed to fetch data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    setAddingRepo(true);
    try {
      await apiFetch("/developer/repos", {
        method: "POST",
        body: JSON.stringify({ repoUrl: newRepoUrl.trim(), skipValidation: true }),
      });
      setNewRepoUrl("");
      setActiveTab("repos");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to add repository");
    } finally {
      setAddingRepo(false);
    }
  };

  const handleRefreshRepo = async (repoUrl: string) => {
    try {
      await apiFetch(`/developer/repos/${encodeURIComponent(repoUrl)}/refresh`, {
        method: "POST",
        body: JSON.stringify({ skipValidation: true }),
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to refresh repository");
    }
  };

  const handleDeleteRepo = async (repoUrl: string) => {
    if (!confirm(`Delete all commands from "${repoUrl}"?`)) return;

    try {
      await apiFetch(`/developer/repos/${encodeURIComponent(repoUrl)}`, {
        method: "DELETE",
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to delete repository");
    }
  };

  const getRepoName = (repoUrl: string) => {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : repoUrl;
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">AKKA DEV</div>
        <nav className="sidebar-nav">
          <button
            className={activeTab === "repos" ? "active" : ""}
            onClick={() => setActiveTab("repos")}
          >
            📦 Commands
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-ghost" onClick={handleLogout} style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* SDK Section */}
        <div className="sdk-section">
          <h2>🛠️ Akka SDK</h2>
          <p>
            Build WhatsApp commands with TypeScript. The SDK provides everything you need: HTTP requests, scheduling, reactions, and more.
          </p>
          <div className="sdk-links">
            <a 
              href="https://github.com/snailsquid/akka-sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <GitHub style={{ width: '1.25rem', height: '1.25rem' }} />
              View on GitHub
            </a>
            <a 
              href="https://www.npmjs.com/package/@akka-bot/sdk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <ExternalLink style={{ width: '1.25rem', height: '1.25rem' }} />
              NPM Package
            </a>
          </div>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <h1>Your Commands</h1>
          <div className="actions">
            <button
              className="btn btn-secondary"
              onClick={() => setActiveTab("add-repo")}
            >
              <Plus style={{ width: '1rem', height: '1rem' }} />
              Register Command
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                setActiveTab("repos");
                fetchData();
              }} 
              disabled={loading}
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        {loading ? (
          <div className="card">
            <p style={{ textAlign: "center", fontSize: "1.125rem", fontWeight: 700 }}>
              Loading...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "add-repo" && (
              <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
                <h2>Register Command</h2>
                <form onSubmit={handleAddRepo}>
                  <div className="form-group">
                    <label>Repository URL</label>
                    <input
                      type="text"
                      value={newRepoUrl}
                      onChange={(e) => setNewRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repo"
                      required
                    />
                    <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", fontWeight: 700, opacity: 0.7 }}>
                      Repository must contain an <code>akka.yaml</code> manifest with command definitions.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button type="submit" className="btn btn-primary" disabled={addingRepo}>
                      {addingRepo ? "Registering..." : "Register Command"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setActiveTab("repos");
                        setNewRepoUrl("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "repos" && (
              <div>
                {repos.length === 0 ? (
                  <div className="card empty-state">
                    <p>No commands registered yet.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveTab("add-repo")}
                    >
                      <Plus style={{ width: '1rem', height: '1rem' }} />
                      Register Your First Command
                    </button>
                  </div>
                ) : (
                  repos.map((repo) => (
                    <div key={repo.repoUrl} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                        <div>
                          <h3 style={{ marginBottom: "0.5rem" }}>{getRepoName(repo.repoUrl)}</h3>
                          <code style={{ fontSize: "0.75rem", opacity: 0.7 }}>{repo.repoUrl}</code>
                          {repo.manifestVersion && (
                            <span className="badge badge-neutral" style={{ marginLeft: "0.75rem" }}>
                              v{repo.manifestVersion}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleRefreshRepo(repo.repoUrl)}
                          >
                            <RefreshCw style={{ width: '1rem', height: '1rem' }} />
                            Refresh
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteRepo(repo.repoUrl)}
                          >
                            <Trash2 style={{ width: '1rem', height: '1rem' }} />
                            Delete
                          </button>
                        </div>
                      </div>

                      {repo.commands.length === 0 ? (
                        <p style={{ fontWeight: 700, opacity: 0.7 }}>No commands in this repository.</p>
                      ) : (
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Slug</th>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {repo.commands.map((cmd: any) => (
                                <tr key={cmd.id}>
                                  <td>
                                    <code>{cmd.slug}</code>
                                  </td>
                                  <td>{cmd.name}</td>
                                  <td style={{ maxWidth: "300px" }}>
                                    {cmd.description}
                                  </td>
                                  <td>
                                    <span className={`badge ${cmd.status === "active" ? "badge-success" : "badge-danger"}`}>
                                      {cmd.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
