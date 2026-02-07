"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { getSpeechAudioManager } from "@/lib/audio/SpeechAudioManager";

/* ── Hook: prefers-reduced-motion ── */
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersReduced;
}

/* ── Types ── */
type BubbleState = "hidden" | "thinking" | "speaking" | "done";

interface SpeechBubbleProps {
  /** The executive-summary text the robot should speak */
  text: string;
  /** Whether the analysis results are visible (triggers the bubble) */
  active: boolean;
  /** Called from parent *during a user gesture* so we can prime AudioContext */
  audioManagerRef: React.MutableRefObject<ReturnType<
    typeof getSpeechAudioManager
  > | null>;
}

/* ── Component ── */
export function SpeechBubble({
  text,
  active,
  audioManagerRef,
}: SpeechBubbleProps) {
  const prefersReduced = usePrefersReducedMotion();

  const [bubbleState, setBubbleState] = useState<BubbleState>("hidden");
  const [displayedText, setDisplayedText] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  // Refs for timers so we can cancel cleanly
  const charTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Memoize the audio manager so we only get it once
  const mgr = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getSpeechAudioManager();
  }, []);

  // Keep the parent's ref in sync
  useEffect(() => {
    if (audioManagerRef) audioManagerRef.current = mgr;
  }, [mgr, audioManagerRef]);

  // Read persisted mute state
  useEffect(() => {
    if (mgr) setIsMuted(mgr.muted);
  }, [mgr]);

  /* ── Cancel everything helper ── */
  const hardReset = useCallback(() => {
    if (charTimerRef.current) clearTimeout(charTimerRef.current);
    charTimerRef.current = null;
    charIndexRef.current = 0;
    setDisplayedText("");
    setBubbleState("hidden");
    mgr?.cancel();
  }, [mgr]);

  /* ── Typewriter engine ── */
  const startTypewriter = useCallback(
    (fullText: string, durationSec: number) => {
      // Calculate per-character delay from audio duration
      const charCount = fullText.length;
      // If muted or reduced motion, use a fast default
      const totalMs =
        isMuted || prefersReduced ? charCount * 12 : durationSec * 1000;
      const charDelay = Math.max(8, totalMs / charCount);

      charIndexRef.current = 0;
      setDisplayedText("");
      setBubbleState("speaking");

      const tick = () => {
        charIndexRef.current++;
        setDisplayedText(fullText.slice(0, charIndexRef.current));

        if (charIndexRef.current < charCount) {
          charTimerRef.current = setTimeout(tick, charDelay);
        } else {
          setBubbleState("done");
        }
      };
      charTimerRef.current = setTimeout(tick, charDelay);
    },
    [isMuted, prefersReduced],
  );

  /* ── Main trigger: when `active` becomes true ── */
  useEffect(() => {
    if (!active || !mgr || !text) {
      hardReset();
      return;
    }

    let cancelled = false;
    setBubbleState("thinking");

    // Wire callbacks
    mgr.setCallbacks({
      onStateChange: () => {},
      onReady: () => {},
      onEnd: () => {},
    });

    (async () => {
      try {
        const dur = await mgr.load(text);
        if (cancelled) return;

        // Start audio + text simultaneously
        mgr.play();
        startTypewriter(text, dur);
      } catch {
        if (cancelled) return;
        // If TTS fails, fall back to text-only at a fast speed
        startTypewriter(text, 0);
      }
    })();

    return () => {
      cancelled = true;
      hardReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text]);

  /* ── Mute toggle ── */
  const handleMuteToggle = useCallback(() => {
    if (!mgr) return;
    const newMuted = mgr.toggleMute();
    setIsMuted(newMuted);
  }, [mgr]);

  /* ── Replay ── */
  const handleReplay = useCallback(() => {
    if (!mgr || !text) return;
    mgr.replay();
    const dur = mgr.duration;
    startTypewriter(text, dur);
  }, [mgr, text, startTypewriter]);

  /* ── Reduced motion: instant display ── */
  useEffect(() => {
    if (prefersReduced && bubbleState === "speaking") {
      if (charTimerRef.current) clearTimeout(charTimerRef.current);
      setDisplayedText(text);
      setBubbleState("done");
    }
  }, [prefersReduced, bubbleState, text]);

  /* ── Render ── */
  if (bubbleState === "hidden") return null;

  return (
    <AnimatePresence>
      <motion.div
        className="w-full max-w-[400px] relative"
        initial={{ opacity: 0, scale: 0.92, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.92, x: -10 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {/* Bubble tail pointing LEFT toward robot */}
        <div className="absolute -left-2.5 top-8 w-5 h-5 rotate-45 glass border-t-0 border-r-0 z-0" />

        {/* Main bubble */}
        <div
          className="glass rounded-2xl p-5 relative z-10 overflow-hidden"
          style={{
            borderColor: "rgba(0, 229, 176, 0.12)",
            boxShadow:
              "0 0 0 1px rgba(0,229,176,0.06) inset, 0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(0,229,176,0.04)",
          }}
        >
          {/* Top edge glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/30 to-transparent" />

          {/* Label */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal/60">
              Executive Summary
            </span>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Mute */}
              <button
                onClick={handleMuteToggle}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.05]"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX size={13} className="text-text-tertiary" />
                ) : (
                  <Volume2 size={13} className="text-teal/70" />
                )}
              </button>

              {/* Replay (only visible when done) */}
              {bubbleState === "done" && (
                <motion.button
                  onClick={handleReplay}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.05]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  aria-label="Replay"
                >
                  <RotateCcw size={13} className="text-text-tertiary" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Text content */}
          <div className="min-h-[48px]">
            {bubbleState === "thinking" && (
              <motion.div
                className="flex items-center gap-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-teal/50"
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
                <span className="text-xs text-text-tertiary ml-2 font-mono">
                  Processing voice...
                </span>
              </motion.div>
            )}

            {(bubbleState === "speaking" || bubbleState === "done") && (
              <p className="text-[13px] leading-relaxed text-text-secondary">
                {displayedText}
                {/* Blinking cursor while typing */}
                {bubbleState === "speaking" && (
                  <motion.span
                    className="inline-block w-[2px] h-[14px] bg-teal/60 ml-0.5 align-text-bottom"
                    animate={{ opacity: [1, 0] }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      ease: "steps(2)",
                    }}
                  />
                )}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
