"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileDown, FileText, Loader2 } from "lucide-react";
import type { HiringReport } from "@/lib/types/report";

interface ExportControlsProps {
  report: HiringReport;
}

export function ExportControls({ report }: ExportControlsProps) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleMarkdown = useCallback(() => {
    // Synchronous — import is small
    import("@/lib/export/markdown").then(({ downloadMarkdown }) => {
      downloadMarkdown(report);
    });
  }, [report]);

  const handlePDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      const { downloadPDF } = await import("@/lib/export/pdf");
      await downloadPDF(report);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [report]);

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* PDF button — primary */}
      <motion.button
        onClick={handlePDF}
        disabled={pdfLoading}
        className="h-10 px-4 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-wait relative overflow-hidden group"
        style={{
          background: "linear-gradient(135deg, #00E5B0 0%, #00C49A 100%)",
          color: "#07080D",
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label="Export as PDF"
      >
        {pdfLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <FileDown size={15} />
        )}
        {pdfLoading ? "Generating…" : "Export PDF"}
        {/* Hover glow overlay */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
      </motion.button>

      {/* Markdown button — ghost/outlined */}
      <motion.button
        onClick={handleMarkdown}
        className="h-10 px-4 rounded-xl text-sm flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] text-text-secondary transition-all duration-300 hover:border-teal/30 hover:text-teal hover:bg-white/[0.04] relative overflow-hidden group"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label="Export as Markdown"
      >
        <FileText size={15} />
        Markdown
      </motion.button>
    </motion.div>
  );
}
