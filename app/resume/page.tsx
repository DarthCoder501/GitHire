"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Github,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Key,
  Target,
  Upload,
  Copy,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { NavHeader } from "@/components/NavHeader";
import { createClient } from "@/lib/supabase/client";
import { extractProjectSection } from "@/lib/resume/projectSection";
import type { ResumeReport } from "@/lib/types/resumeReport";
import type {
  BulletAssessment,
  BulletAssessmentStatus,
} from "@/lib/types/truthfulness";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const STATUS_LABEL: Record<BulletAssessmentStatus, string> = {
  supported: "Supported by repo",
  partially_supported: "Partially supported",
  not_found: "Not found",
  contradicted: "Contradicted",
};

const STATUS_COLOR: Record<BulletAssessmentStatus, string> = {
  supported: "text-teal",
  partially_supported: "text-amber",
  not_found: "text-amber",
  contradicted: "text-red",
};

export default function ResumePage() {
  const [inputMode, setInputMode] = useState<"file" | "paste">("paste");
  const [rawContent, setRawContent] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [extractLoading, setExtractLoading] = useState(false);

  const projectSection = useMemo(
    () => (rawContent ? extractProjectSection(rawContent) : ""),
    [rawContent],
  );
  const hasProjectSection = projectSection.length > 0;

  const [candidateUsername, setCandidateUsername] = useState("");
  const [vsLoading, setVsLoading] = useState(false);
  const [vsError, setVsError] = useState<string | null>(null);
  const [vsResult, setVsResult] = useState<{
    bulletAssessments: BulletAssessment[];
    aligned: {
      resumeMention: string;
      repoName: string;
      repoDescription: string | null;
    }[];
    notFound: string[];
  } | null>(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [report, setReport] = useState<ResumeReport | null>(null);

  const loadSession = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    return s;
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileError(null);
      setExtractLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/resume-extract", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          setFileError(data.error || "Failed to extract text");
          return;
        }
        setRawContent((data.text as string) || "");
      } catch {
        setFileError("An unexpected error occurred");
      } finally {
        setExtractLoading(false);
        e.target.value = "";
      }
    },
    [],
  );

  const handleResumeVsRepo = useCallback(async () => {
    const textToSend = rawContent.trim();
    if (!textToSend || !candidateUsername.trim()) return;
    const s = await loadSession();
    if (!s) {
      setVsError("Please sign in to use Resume vs repo");
      return;
    }
    setVsError(null);
    setVsResult(null);
    setVsLoading(true);
    try {
      const res = await fetch("/api/resume-vs-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.access_token}`,
        },
        body: JSON.stringify({
          resumeText: textToSend,
          candidateUsername: candidateUsername.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVsError(data.error || "Request failed");
        return;
      }
      setVsResult({
        bulletAssessments: data.bulletAssessments ?? [],
        aligned: data.aligned ?? [],
        notFound: data.notFound ?? [],
      });
    } catch {
      setVsError("An unexpected error occurred");
    } finally {
      setVsLoading(false);
    }
  }, [rawContent, candidateUsername, loadSession]);

  const textForReport = projectSection || rawContent;
  const handleResumeReport = useCallback(async () => {
    const text = textForReport.trim();
    if (!text || text.length < 100) return;
    setReportError(null);
    setReport(null);
    setReportLoading(true);
    try {
      const res = await fetch("/api/resume-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReportError(data.error || "Analysis failed");
        return;
      }
      setReport(data.report as ResumeReport);
    } catch {
      setReportError("An unexpected error occurred");
    } finally {
      setReportLoading(false);
    }
  }, [textForReport]);

  return (
    <main className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.06)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 py-8 md:py-12">
        <NavHeader />

        <div className="flex items-center gap-3 mb-6">
          <FileText size={20} className="text-teal" />
          <h1 className="text-xl font-semibold text-text-primary">Resume</h1>
        </div>

        <p className="text-sm text-text-secondary mb-8 max-w-2xl">
          Upload a resume (PDF/DOCX) or paste text. We use only the{" "}
          <strong>Projects</strong> section to check bullet-level claims against
          the candidate&apos;s GitHub repos and to generate a resume report.
          Sign in required for Resume vs repo.
        </p>

        <div className="space-y-8">
          {/* Resume input: file upload or paste */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Key size={15} className="text-teal" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
                Resume input
              </span>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              Choose one: upload a file (PDF or DOCX) or paste resume text. Only
              the project section is extracted and used below.
            </p>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setInputMode("file");
                  setFileError(null);
                }}
                className={`min-h-[40px] px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                  inputMode === "file"
                    ? "bg-teal/20 border border-teal/40 text-teal"
                    : "bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:border-white/[0.1]"
                }`}
              >
                <Upload size={16} />
                Upload file
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("paste");
                  setFileError(null);
                }}
                className={`min-h-[40px] px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                  inputMode === "paste"
                    ? "bg-teal/20 border border-teal/40 text-teal"
                    : "bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:border-white/[0.1]"
                }`}
              >
                <Copy size={16} />
                Paste text instead
              </button>
            </div>

            {inputMode === "file" && (
              <div className="mb-4">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                  Resume file (PDF or DOCX)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileSelect}
                    disabled={extractLoading}
                    className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-teal/10 file:text-teal file:font-medium file:cursor-pointer hover:file:bg-teal/20"
                  />
                  {extractLoading && (
                    <Loader2 size={18} className="animate-spin text-teal" />
                  )}
                </div>
                {fileError && (
                  <p className="mt-2 text-xs text-red flex items-center gap-1">
                    <AlertCircle size={12} />
                    {fileError}
                  </p>
                )}
              </div>
            )}

            {inputMode === "paste" && (
              <div className="mb-4">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                  Resume text
                </label>
                <textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Paste full resume here. We'll extract the Projects section..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono resize-y min-h-[120px]"
                />
              </div>
            )}

            {hasProjectSection && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-teal/20">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal mb-2">
                  Parsed project section (used for validation & report)
                </p>
                <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans max-h-[200px] overflow-y-auto">
                  {projectSection}
                </pre>
              </div>
            )}
            {rawContent && !hasProjectSection && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-amber">
                  No &quot;Projects&quot; section detected. Ensure the resume
                  has a section titled Projects, Project Experience, Development
                  Projects, or similar.
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
                    Show raw extracted text (first 800 chars)
                  </summary>
                  <pre className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/10 overflow-x-auto whitespace-pre-wrap break-words font-sans max-h-48 overflow-y-auto">
                    {rawContent.slice(0, 800)}
                    {rawContent.length > 800 ? "…" : ""}
                  </pre>
                </details>
              </div>
            )}
          </GlassCard>

          {/* Resume vs repo */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Key size={15} className="text-teal" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
                Resume vs repo truthfulness
              </span>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              We check whether each project <strong>bullet</strong> is supported
              by the candidate&apos;s GitHub repos (technologies, features,
              numbers), not only project names.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                  GitHub username
                </label>
                <div className="relative">
                  <Github
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    type="text"
                    value={candidateUsername}
                    onChange={(e) => setCandidateUsername(e.target.value)}
                    placeholder="e.g. torvalds"
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono"
                  />
                </div>
              </div>
              <motion.button
                onClick={handleResumeVsRepo}
                disabled={
                  vsLoading || !rawContent.trim() || !candidateUsername.trim()
                }
                className="min-h-[44px] px-5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, #00E5B0 0%, #00C49A 100%)",
                  color: "#07080D",
                }}
                whileTap={{ scale: 0.98 }}
              >
                {vsLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Check alignment & bullet claims
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </div>
            <AnimatePresence>
              {vsError && (
                <motion.div
                  className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red/10 border border-red/20"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <AlertCircle size={14} className="text-red shrink-0" />
                  <p className="text-xs text-red">{vsError}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {vsResult && (
                <motion.div
                  className="mt-6 space-y-6"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {vsResult.bulletAssessments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal mb-3">
                        Bullet-level truthfulness
                      </p>
                      <ul className="space-y-3">
                        {vsResult.bulletAssessments.map((a, i) => (
                          <li
                            key={i}
                            className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                          >
                            <p className="text-sm text-text-primary mb-1">
                              &ldquo;{a.bullet}&rdquo;
                            </p>
                            <p
                              className={`text-xs font-medium mb-1 ${STATUS_COLOR[a.status]}`}
                            >
                              {STATUS_LABEL[a.status]}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {a.evidence}
                            </p>
                            {a.extractedClaims &&
                              a.extractedClaims.length > 0 && (
                                <p className="text-[10px] text-text-tertiary mt-1">
                                  Claims: {a.extractedClaims.join(", ")}
                                </p>
                              )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {vsResult.aligned.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal mb-2">
                        Project names found in GitHub
                      </p>
                      <ul className="space-y-2">
                        {vsResult.aligned.map((a, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-text-secondary"
                          >
                            <CheckCircle
                              size={14}
                              className="text-teal mt-0.5 shrink-0"
                            />
                            <span>
                              &ldquo;{a.resumeMention}&rdquo; → repo{" "}
                              <span className="text-teal font-mono">
                                {a.repoName}
                              </span>
                              {a.repoDescription && (
                                <span className="text-text-tertiary">
                                  {" "}
                                  — {a.repoDescription}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {vsResult.notFound.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber mb-2">
                        Project phrases not found in repos
                      </p>
                      <ul className="space-y-1">
                        {vsResult.notFound.map((n, i) => (
                          <li
                            key={i}
                            className="text-sm text-text-tertiary flex items-center gap-2"
                          >
                            <AlertCircle
                              size={12}
                              className="text-amber shrink-0"
                            />
                            {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {vsResult.bulletAssessments.length === 0 &&
                    vsResult.aligned.length === 0 &&
                    vsResult.notFound.length === 0 && (
                      <p className="text-sm text-text-tertiary">
                        No project bullets or phrases extracted from resume.
                      </p>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Resume report */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Target size={15} className="text-teal" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
                Resume report
              </span>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              Generate a resume-focused evaluation from the project section (or
              full paste). No sign-in required.
            </p>
            <motion.button
              onClick={handleResumeReport}
              disabled={reportLoading || textForReport.trim().length < 100}
              className="min-h-[44px] px-5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #00E5B0 0%, #00C49A 100%)",
                color: "#07080D",
              }}
              whileTap={{ scale: 0.98 }}
            >
              {reportLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Generate resume report
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
            <AnimatePresence>
              {reportError && (
                <motion.div
                  className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red/10 border border-red/20"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <AlertCircle size={14} className="text-red shrink-0" />
                  <p className="text-xs text-red">{reportError}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {report && (
                <motion.div
                  className="mt-6 space-y-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  variants={{
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Experience", value: report.experienceScore },
                      { label: "Skills", value: report.skillsScore },
                      { label: "Consistency", value: report.consistencyScore },
                      { label: "Clarity", value: report.clarityScore },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl p-3 border border-teal/20 bg-teal/5 text-center"
                      >
                        <p className="text-2xl font-bold text-teal">{value}</p>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2">
                      Overall (resume)
                    </p>
                    <p className="text-2xl font-bold text-teal">
                      {report.overallScore} / 100
                    </p>
                  </div>
                  {report.strengths.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal mb-2">
                        Strengths
                      </p>
                      <ul className="space-y-1">
                        {report.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-text-secondary">
                            • {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.growthAreas.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber mb-2">
                        Growth areas
                      </p>
                      <ul className="space-y-1">
                        {report.growthAreas.map((g, i) => (
                          <li key={i} className="text-sm text-text-secondary">
                            • {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.recommendation && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2">
                        Recommendation
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {report.recommendation}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
