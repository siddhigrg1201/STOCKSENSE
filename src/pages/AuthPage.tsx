import React, { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Mail, Lock, User, ArrowRight, Loader2, Sun, Moon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function AuthPage({ type }: { type: "login" | "signup" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (type === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative">
      {/* Theme Toggle Button */}
      <div className="absolute top-8 right-8">
        <button 
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-white/5 dark:bg-white/5 light:bg-black/5 text-text-secondary hover:text-accent transition-all border border-transparent hover:border-accent/20"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp size={32} className="text-accent" />
          <span className="text-2xl font-bold text-text-primary">StockSense</span>
        </div>

        <div className="glass p-8 rounded-3xl shadow-2xl">
          <h1 className="text-2xl font-bold mb-2 text-text-primary">
            {type === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-text-secondary mb-8">
            {type === "login" 
              ? "Enter your credentials to access your dashboard." 
              : "Join thousands of traders making smarter decisions."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 focus:border-accent focus:bg-card-hover outline-none transition-all text-text-primary"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 focus:border-accent focus:bg-card-hover outline-none transition-all text-text-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 focus:border-accent focus:bg-card-hover outline-none transition-all text-text-primary"
                />
              </div>
            </div>

            {error && (
              <p className="text-warning text-sm bg-warning/10 p-3 rounded-lg border border-warning/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full glow-button bg-accent text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {type === "login" ? "Login" : "Sign Up"}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-text-secondary">
            {type === "login" ? (
              <>
                Don't have an account?{" "}
                <Link to="/signup" className="text-accent hover:underline">Sign up</Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-accent hover:underline">Login</Link>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
