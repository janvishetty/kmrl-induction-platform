import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { loginAdmin } from "@/lib/api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div 
      className="relative min-h-screen bg-background bg-cover bg-center bg-no-repeat flex items-center justify-center px-4"
      style={{ backgroundImage: `url('/login-bg.png')` }}
    >
      {/* Background overlay (adjustable fade at /75) */}
      <div className="absolute inset-0 bg-background/75 backdrop-blur-[1px]"></div>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="text-center">
            <h1
              className="text-2xl font-semibold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Rail Dhara
            </h1>
            <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mt-1">
              KMRL Operations Platform
            </p>
          </div>
        </div>

        {/* Card Box */}
        <div className="card-elevated p-8 shadow-lg border border-border/60">
          <div className="mb-6">
            <span className="inline-block text-xs font-semibold tracking-wider uppercase text-primary mb-1">
              Admin Access
            </span>
            <h2
              className="text-2xl font-semibold text-foreground tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Sign in to your account
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Restricted to authorized KMRL operations staff only.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-foreground uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-foreground uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Authenticating..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer Security Note */}
        <div className="text-center mt-6">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Lock className="w-3.5 h-3.5" />
            Secure Enterprise Gateway • KMRL Ops
          </p>
        </div>
      </div>
    </div>
  );
}