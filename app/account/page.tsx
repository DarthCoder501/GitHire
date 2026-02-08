"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  History,
  GitCompareArrows,
  FileText,
  LogOut,
  Search,
  Home,
  Target,
  Check,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { NavHeader } from "@/components/NavHeader";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

interface Stats {
  pastSearches: number;
  savedReports: number;
  comparisons: number;
}

const ROLE_LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
] as const;

const FOCUS_AREAS = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Full-stack" },
  { value: "devops", label: "DevOps" },
  { value: "ai-ml", label: "AI / ML" },
] as const;

export default function AccountPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    pastSearches: 0,
    savedReports: 0,
    comparisons: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Preferences state
  const [roleLevel, setRoleLevel] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Fetch counts in parallel
      const [chatsRes, reportsRes] = await Promise.all([
        fetch("/api/chats", { headers }),
        fetch("/api/reports", { headers }),
      ]);

      const chatsData = chatsRes.ok ? await chatsRes.json() : { chats: [] };
      const reportsData = reportsRes.ok
        ? await reportsRes.json()
        : { reports: [] };

      // For comparisons, count from Supabase directly
      const { count } = await supabase
        .from("comparisons")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      setStats({
        pastSearches: (chatsData.chats || []).length,
        savedReports: (reportsData.reports || []).length,
        comparisons: count || 0,
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/preferences", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoleLevel(data.preferences?.role_level || null);
        setFocus(data.preferences?.focus || null);
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  const savePreferences = useCallback(async () => {
    setPrefsSaving(true);
    setPrefsSaved(false);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role_level: roleLevel, focus }),
      });
      if (res.ok) {
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setPrefsSaving(false);
    }
  }, [roleLevel, focus]);

  useEffect(() => {
    if (!userLoading && user) {
      fetchStats();
      fetchPreferences();
    }
  }, [userLoading, user, fetchStats, fetchPreferences]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (userLoading) {
    return (
      <main className="min-h-screen relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.06)_0%,transparent_70%)]" />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 py-8 md:py-12">
          <NavHeader />
          <div className="flex items-center gap-2 py-20 justify-center">
            <div className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
            <span className="text-xs text-text-tertiary font-mono">
              Loading...
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.06)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 py-8 md:py-12">
        <NavHeader />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <User size={20} className="text-teal" />
          <h1 className="text-xl font-semibold text-text-primary">
            Your Account
          </h1>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Account Info */}
          <GlassCard className="md:col-span-2 lg:col-span-3" variants={fadeUp}>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
              Account Information
            </span>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                <User size={24} className="text-teal" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={13} className="text-text-tertiary shrink-0" />
                  <p className="text-sm text-text-primary truncate font-mono">
                    {user?.email || "—"}
                  </p>
                </div>
                <p className="text-xs text-text-tertiary">
                  Member since{" "}
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Stats cards */}
          <GlassCard variants={fadeUp} className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-3">
              <History size={18} className="text-teal" />
            </div>
            {statsLoading ? (
              <div className="h-8 w-10 bg-white/[0.04] rounded mx-auto mb-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-teal mb-1">
                {stats.pastSearches}
              </p>
            )}
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
              Past Searches
            </p>
          </GlassCard>

          <GlassCard variants={fadeUp} className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-3">
              <FileText size={18} className="text-teal" />
            </div>
            {statsLoading ? (
              <div className="h-8 w-10 bg-white/[0.04] rounded mx-auto mb-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-teal mb-1">
                {stats.savedReports}
              </p>
            )}
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
              Saved Reports
            </p>
          </GlassCard>

          <GlassCard variants={fadeUp} className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-3">
              <GitCompareArrows size={18} className="text-teal" />
            </div>
            {statsLoading ? (
              <div className="h-8 w-10 bg-white/[0.04] rounded mx-auto mb-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-teal mb-1">
                {stats.comparisons}
              </p>
            )}
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
              Comparisons
            </p>
          </GlassCard>

          {/* Role & Level Targeting */}
          <GlassCard className="md:col-span-2 lg:col-span-3" variants={fadeUp}>
            <div className="flex items-center gap-2 mb-1">
              <Target size={15} className="text-teal" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
                Hiring Preferences
              </span>
            </div>
            <p className="text-xs text-text-tertiary mb-5">
              Optional — tailor analyses and comparisons to your hiring needs.
            </p>

            {prefsLoading ? (
              <div className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-5">
                {/* Role Level */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                    Target Role Level
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_LEVELS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() =>
                          setRoleLevel(roleLevel === r.value ? null : r.value)
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 border ${
                          roleLevel === r.value
                            ? "bg-teal/10 text-teal border-teal/20"
                            : "text-text-secondary border-white/[0.06] hover:border-teal/20 hover:text-text-primary"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                    Target Focus Area
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_AREAS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() =>
                          setFocus(focus === f.value ? null : f.value)
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 border ${
                          focus === f.value
                            ? "bg-teal/10 text-teal border-teal/20"
                            : "text-text-secondary border-white/[0.06] hover:border-teal/20 hover:text-text-primary"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <motion.button
                  onClick={savePreferences}
                  disabled={prefsSaving}
                  className="h-10 px-5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-60 relative overflow-hidden group"
                  style={{
                    background:
                      "linear-gradient(135deg, #00E5B0 0%, #00C49A 100%)",
                    color: "#07080D",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {prefsSaved ? (
                    <>
                      <Check size={15} />
                      Saved
                    </>
                  ) : prefsSaving ? (
                    <div className="w-4 h-4 border-2 border-[#07080D]/30 border-t-[#07080D] rounded-full animate-spin" />
                  ) : (
                    "Save Preferences"
                  )}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                </motion.button>
              </div>
            )}
          </GlassCard>

          {/* Quick Links */}
          <GlassCard className="md:col-span-2 lg:col-span-3" variants={fadeUp}>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
              Quick Links
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] hover:border-teal/20 hover:bg-teal/5 transition-all duration-300 group"
              >
                <Home
                  size={16}
                  className="text-text-tertiary group-hover:text-teal transition-colors"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-teal transition-colors">
                    Analyze
                  </p>
                  <p className="text-[10px] text-text-tertiary">
                    Run a new profile analysis
                  </p>
                </div>
              </Link>

              <Link
                href="/chats"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] hover:border-teal/20 hover:bg-teal/5 transition-all duration-300 group"
              >
                <Search
                  size={16}
                  className="text-text-tertiary group-hover:text-teal transition-colors"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-teal transition-colors">
                    Past Searches
                  </p>
                  <p className="text-[10px] text-text-tertiary">
                    View saved reports
                  </p>
                </div>
              </Link>

              <Link
                href="/compare"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] hover:border-teal/20 hover:bg-teal/5 transition-all duration-300 group"
              >
                <GitCompareArrows
                  size={16}
                  className="text-text-tertiary group-hover:text-teal transition-colors"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-teal transition-colors">
                    Compare
                  </p>
                  <p className="text-[10px] text-text-tertiary">
                    Side-by-side candidates
                  </p>
                </div>
              </Link>
            </div>
          </GlassCard>

          {/* Sign Out */}
          <GlassCard className="md:col-span-2 lg:col-span-3" variants={fadeUp}>
            <motion.button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-text-secondary hover:text-red border border-white/[0.06] hover:border-red/20 transition-all duration-300"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <LogOut size={15} />
              Sign Out
            </motion.button>
          </GlassCard>
        </motion.div>
      </div>
    </main>
  );
}
