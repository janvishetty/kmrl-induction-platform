import { useState } from "react";
import { Lock } from "lucide-react";
import { loginAdmin } from "@/lib/api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password");
      return;
    }

    setLoading(true);
    try {
      const ok = await loginAdmin(username, password);
      if (!ok) {
        setError("Incorrect username or password");
        return;
      }
      onLogin?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="text-center">
            <p
              className="text-lg font-medium text-foreground leading-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Rail Dhara
            </p>
            <p className="mono-label leading-tight mt-1">KMRL Operations</p>
          </div>
        </div>

        <div className="card-elevated p-8">
          <p className="mono-label mb-2">Admin access</p>
          <h1
            className="text-xl font-medium text-foreground mb-1"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Sign in
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Restricted to authorized KMRL operations staff.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mono-label block mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full bg-transparent border border-input rounded-[var(--radius)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="password" className="mono-label block mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-transparent border border-input rounded-[var(--radius)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-[var(--radius)] py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mono-label text-center mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          For authorized personnel only
        </p>
      </div>
    </div>
  );
}