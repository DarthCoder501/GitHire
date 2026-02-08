/**
 * Resume-focused report (experience, skills, consistency, clarity).
 * Same conceptual style as HiringReport but for resume content.
 */

export interface ResumeReport {
  experienceScore: number;
  skillsScore: number;
  consistencyScore: number;
  clarityScore: number;
  overallScore: number;
  strengths: string[];
  growthAreas: string[];
  recommendation: string;
  executiveSummary?: string;
}
