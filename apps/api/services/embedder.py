import re
from typing import List
from openai import AsyncOpenAI
from config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SECTION_HEADERS = re.compile(
    r"^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SUMMARY|OBJECTIVE|CERTIFICATIONS|AWARDS|PUBLICATIONS|WORK HISTORY)\s*$",
    re.IGNORECASE | re.MULTILINE,
)


def chunk_resume(text: str) -> List[str]:
    sections = SECTION_HEADERS.split(text)
    chunks: List[str] = []

    for section in sections:
        section = section.strip()
        if not section:
            continue

        bullets = re.split(r"\n\s*[-•*]\s+", section)
        current = ""
        for bullet in bullets:
            bullet = bullet.strip()
            if not bullet:
                continue
            candidate = f"{current}\n• {bullet}" if current else bullet
            if len(candidate) > 800 and current:
                chunks.append(current.strip())
                current = bullet
            else:
                current = candidate

        if current.strip():
            chunks.append(current.strip())

    return chunks if chunks else [text[:2000]]


async def embed_texts(texts: List[str]) -> List[List[float]]:
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [d.embedding for d in response.data]


async def embed_query(query: str) -> List[float]:
    embeddings = await embed_texts([query])
    return embeddings[0]
