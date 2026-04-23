import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client

from config import settings
from services.pdf_parser import parse_pdf
from services.embedder import chunk_resume, embed_texts
from services.vector_store import embed_and_store

router = APIRouter()

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class ProcessResumeRequest(BaseModel):
    resume_id: str
    storage_url: str
    namespace: str


@router.post("/process")
async def process_resume(req: ProcessResumeRequest):
    async with httpx.AsyncClient() as http:
        response = await http.get(req.storage_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to download PDF")
        pdf_bytes = response.content

    raw_text = parse_pdf(pdf_bytes)
    chunks = chunk_resume(raw_text)
    embeddings = await embed_texts(chunks)
    await embed_and_store(chunks, embeddings, req.namespace)

    supabase.table("resumes").update({"raw_text": raw_text}).eq("id", req.resume_id).execute()

    return {"chunks_stored": len(chunks), "namespace": req.namespace}
