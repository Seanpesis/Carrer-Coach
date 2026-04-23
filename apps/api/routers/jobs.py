import re
from fastapi import APIRouter
from pydantic import BaseModel
from supabase import create_client

from config import settings

router = APIRouter()

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

KEYWORD_PATTERN = re.compile(
    r"\b(?:python|javascript|typescript|react|node|aws|docker|kubernetes|sql|postgresql|"
    r"machine learning|data science|agile|scrum|ci/cd|devops|terraform|graphql|rest|"
    r"microservices|leadership|communication|analytical|problem.solving)\b",
    re.IGNORECASE,
)


class ExtractKeywordsRequest(BaseModel):
    application_id: str
    job_description: str


@router.post("/extract-keywords")
async def extract_keywords(req: ExtractKeywordsRequest):
    found = list({m.group(0).lower() for m in KEYWORD_PATTERN.finditer(req.job_description)})

    supabase.table("job_applications").update(
        {"jd_keywords": found}
    ).eq("id", req.application_id).execute()

    return {"keywords": found, "count": len(found)}
