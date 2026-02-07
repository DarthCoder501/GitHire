"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageSquare,
  GitCompareArrows,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/chats", label: "Chats", icon: MessageSquare, auth: true },
  { href: "/compare", label: "Compare", icon: GitCompareArrows, auth: true },
];

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Don't render header on auth pages
  if (pathname.startsWith("/auth/")) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.auth || user);

  return (
    <motion.header
      className="flex items-center justify-between gap-3 mb-8 md:mb-12"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 shrink-0">
        <Image
          src="/headstarter-logo.png"
          alt="Headstarter"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span className="text-lg font-semibold tracking-tight text-gradient">
          GitHire
        </span>
        <span className="text-xs text-text-tertiary font-mono ml-1">v1.0</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                active
                  ? "bg-teal/10 text-teal border border-teal/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}

        <div className="w-px h-5 bg-white/[0.06] mx-2" />

        {/* Auth */}
        {loading ? (
          <div className="w-8 h-8 rounded-xl bg-white/[0.03] animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
              <User size={14} className="text-teal" />
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-text-tertiary hover:text-red transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/auth/sign-in"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-teal hover:bg-teal/10 transition-all duration-300"
          >
            <LogIn size={14} />
            Sign in
          </Link>
        )}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="md:hidden w-9 h-9 rounded-xl glass flex items-center justify-center"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <X size={16} className="text-text-secondary" />
        ) : (
          <Menu size={16} className="text-text-secondary" />
        )}
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu panel */}
            <motion.nav
              className="absolute top-0 right-0 w-64 h-full glass p-6 flex flex-col gap-2"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
                  Navigation
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center"
                >
                  <X size={14} className="text-text-secondary" />
                </button>
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                      active
                        ? "bg-teal/10 text-teal border border-teal/20"
                        : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}

              <div className="h-px bg-white/[0.06] my-3" />

              {loading ? null : user ? (
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-tertiary hover:text-red transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              ) : (
                <Link
                  href="/auth/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-teal"
                >
                  <LogIn size={16} />
                  Sign in
                </Link>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
