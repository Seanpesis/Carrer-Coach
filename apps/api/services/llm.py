import json
import re
from anthropic import AsyncAnthropic
from config import settings

client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are CareerCoach AI, an elite career strategist and resume expert.
You have deep knowledge of ATS systems, hiring manager psychology, and industry-specific language patterns.

Rules:
- Be specific, not generic. Reference actual content from their resume.
- Use action-oriented language. Lead with impact metrics when possible.
- When rewriting bullets, provide 2-3 variants ranked by strength.
- Flag ATS risks: missing keywords, weak verbs, vague quantification.
- Be honest. If their background is a stretch for the role, say so tactfully.
- Format responses in clean Markdown."""

AUDIT_PROMPT = """Perform a comprehensive ATS and human review of this resume against the job description.

Return ONLY a valid JSON object:
{
  "match_score": <0-100>,
  "missing_keywords": [...],
  "strong_sections": [...],
  "weak_sections": [...],
  "recommended_rewrites": [{"original": "...", "improved": "...", "reason": "..."}],
  "summary": "3-sentence executive summary"
}"""


async def stream_chat(job_description: str, resume_context: str, messages: list, user_message: str):
    rag_content = f"""--- JOB DESCRIPTION ---
{job_description}

--- RELEVANT RESUME SECTIONS ---
{resume_context}

--- USER QUESTION ---
{user_message}"""

    all_messages = [
        *[{"role": m["role"], "content": m["content"]} for m in messages],
        {"role": "user", "content": rag_content},
    ]

    async with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=all_messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def run_audit(job_description: str, resume_context: str) -> dict:
    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"{AUDIT_PROMPT}\n\n--- JOB DESCRIPTION ---\n{job_description}\n\n--- RESUME ---\n{resume_context}",
            }
        ],
    )
    raw = message.content[0].text if message.content else ""
    json_match = re.search(r"\{[\s\S]*\}", raw)
    return json.loads(json_match.group(0) if json_match else raw)
