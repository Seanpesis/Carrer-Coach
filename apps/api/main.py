from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from routers import resume, chat, jobs
from config import settings

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
    )

app = FastAPI(title="CareerCoach AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/resumes", tags=["resumes"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])


@app.get("/health")
async def health():
    return {"status": "ok"}
