from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import create_client

from config import settings
from services.embedder import embed_query
from services.vector_store import retrieve_context
from services.llm import stream_chat, run_audit

router = APIRouter()

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class ChatRequest(BaseModel):
    application_id: str
    user_id: str
    message: str


class AuditRequest(BaseModel):
    application_id: str
    user_id: str


@router.post("/message")
async def chat_message(req: ChatRequest):
    result = (
        supabase.table("job_applications")
        .select("*, resumes(pinecone_namespace)")
        .eq("id", req.application_id)
        .eq("user_id", req.user_id)
        .single()
        .execute()
    )
    application = result.data
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    history_result = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("application_id", req.application_id)
        .order("created_at", desc=False)
        .limit(20)
        .execute()
    )

    namespace = application.get("resumes", {}).get("pinecone_namespace", "")
    resume_context = ""
    if namespace:
        query_embedding = await embed_query(req.message)
        resume_context = await retrieve_context(query_embedding, namespace)

    async def generate():
        full_response = ""
        async for chunk in stream_chat(
            application["job_description"],
            resume_context,
            history_result.data or [],
            req.message,
        ):
            full_response += chunk
            yield chunk

        supabase.table("chat_messages").insert(
            {"application_id": req.application_id, "role": "assistant", "content": full_response}
        ).execute()

    return StreamingResponse(generate(), media_type="text/plain")


@router.post("/audit")
async def audit(req: AuditRequest):
    result = (
        supabase.table("job_applications")
        .select("*, resumes(pinecone_namespace)")
        .eq("id", req.application_id)
        .eq("user_id", req.user_id)
        .single()
        .execute()
    )
    application = result.data
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    namespace = application.get("resumes", {}).get("pinecone_namespace", "")
    resume_context = ""
    if namespace:
        from services.llm import AUDIT_PROMPT
        embedding = await embed_query(AUDIT_PROMPT)
        resume_context = await retrieve_context(embedding, namespace, top_k=10)

    report = await run_audit(application["job_description"], resume_context)

    supabase.table("job_applications").update(
        {"match_score": report.get("match_score")}
    ).eq("id", req.application_id).execute()

    return report
