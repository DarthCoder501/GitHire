"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserPlus,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Auto-redirect after short delay
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center px-6">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.06)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.04)_0%,transparent_70%)]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-[400px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo + avatar */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-teal/20 bg-teal/10 shrink-0">
            <Image
              src="/robot.png"
              alt="GitHire"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <span className="text-lg font-semibold tracking-tight text-gradient">
            GitHire
          </span>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/20 to-transparent" />

          <div className="flex items-center gap-2 mb-6">
            <UserPlus size={18} className="text-teal" />
            <h1 className="text-lg font-semibold text-text-primary">
              Create Account
            </h1>
          </div>

          {success ? (
            <motion.div
              className="text-center py-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle size={40} className="text-teal mx-auto mb-3" />
              <p className="text-sm text-text-primary font-medium mb-1">
                Account created!
              </p>
              <p className="text-xs text-text-secondary">
                Check your email to confirm, then you&apos;re all set.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Email */}
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  required
                  minLength={6}
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono"
                />
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  className="flex items-center gap-2 p-3 rounded-xl bg-red/10 border border-red/20"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={14} className="text-red shrink-0" />
                  <p className="text-xs text-red">{error}</p>
                </motion.div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group"
                style={{
                  background:
                    "linear-gradient(135deg, #00E5B0 0%, #00C49A 100%)",
                  color: "#07080D",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#07080D]/30 border-t-[#07080D] rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
              </motion.button>
            </form>
          )}

          <p className="text-xs text-text-tertiary text-center mt-5">
            Already have an account?{" "}
            <Link
              href="/auth/sign-in"
              className="text-teal hover:text-teal/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
