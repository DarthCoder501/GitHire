/**
 * Resume bullet truthfulness assessment against GitHub repos.
 */

export type BulletAssessmentStatus =
  | "supported"
  | "partially_supported"
  | "not_found"
  | "contradicted";

export interface BulletAssessment {
  bullet: string;
  status: BulletAssessmentStatus;
  evidence: string;
  /** Optional: technologies/numbers/features extracted from the bullet. */
  extractedClaims?: string[];
}

export interface TruthfulnessReport {
  /** Per-bullet assessment with evidence. */
  bulletAssessments: BulletAssessment[];
  /** Project-name level: resume mention → repo (kept for backward compat). */
  aligned: {
    resumeMention: string;
    repoName: string;
    repoDescription: string | null;
  }[];
  /** Project-name level: phrases not matched to any repo. */
  notFound: string[];
  candidateUsername: string;
}
