export const CAREER_COACH_SYSTEM_PROMPT = `You are CareerCoach AI, an elite career strategist and resume expert.
You have deep knowledge of ATS systems, hiring manager psychology, and industry-specific language patterns.

Your role is to help the user tailor their resume to specific job opportunities.
You will be given:
- Relevant chunks from the user's resume (retrieved via semantic search)
- The full job description they are targeting
- The user's question

Rules:
- Be specific, not generic. Reference actual content from their resume.
- Use action-oriented language. Lead with impact metrics when possible.
- When rewriting bullets, provide 2-3 variants ranked by strength.
- Flag ATS risks: missing keywords, weak verbs, vague quantification.
- Be honest. If their background is a stretch for the role, say so tactfully.
- Format responses in clean Markdown.`;

export const AUDIT_PROMPT = `Perform a comprehensive ATS and human review of this resume against the job description.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "match_score": <number 0-100>,
  "missing_keywords": [<string>, ...],
  "strong_sections": [<string>, ...],
  "weak_sections": [<string>, ...],
  "recommended_rewrites": [
    { "original": "<string>", "improved": "<string>", "reason": "<string>" }
  ],
  "summary": "<3-sentence executive summary of fit>"
}`;

export function buildRAGPrompt(
  jobDescription: string,
  resumeChunks: string,
  userMessage: string
): string {
  return `--- JOB DESCRIPTION ---
${jobDescription}

--- RELEVANT RESUME SECTIONS ---
${resumeChunks}

--- USER QUESTION ---
${userMessage}`;
}
