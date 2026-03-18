import os
import json
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI
from typing import AsyncGenerator
from dotenv import load_dotenv
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY is not set in .env file")

app = FastAPI(title="AI Code Review Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

MODEL = "openrouter/auto"

REVIEW_SYSTEM_PROMPT = """
You are an expert code reviewer.

Analyze the provided code and return ONLY a valid JSON object.

Rules:
- Output must start with { and end with }
- Do NOT include explanations outside JSON
- Do NOT include markdown
- Follow the schema exactly

Schema:
{
  "bugs": [
    {
      "line": number or null,
      "severity": "critical" | "major" | "minor",
      "description": "string",
      "suggestion": "string"
    }
  ],
  "style": [
    {
      "line": number or null,
      "description": "string",
      "suggestion": "string"
    }
  ],
  "security": [
    {
      "line": number or null,
      "severity": "critical" | "major" | "minor",
      "description": "string",
      "suggestion": "string"
    }
  ],
  "summary": "string",
  "score": number,
  "language": "string"
}
"""


class ReviewRequest(BaseModel):
    code: str
    language: str = "auto"


async def stream_review(code: str, language: str) -> AsyncGenerator[str, None]:
    user_message = f"Language: {language}\n\nCode to review:\n```{language}\n{code}\n```"

    try:
         
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": f"{REVIEW_SYSTEM_PROMPT}\n\n{user_message}"
                }
            ],
            stream=True,
            max_tokens=2000,
            temperature=0.3,
            extra_headers={
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "AI Code Review Bot",
            }
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                data = json.dumps({"chunk": delta.content, "done": False})
                yield f"data: {data}\n\n"
                await asyncio.sleep(0)

        yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        error_data = json.dumps({"error": str(e), "done": True})
        yield f"data: {error_data}\n\n"


@app.post("/review")
async def review_code(request: ReviewRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    if len(request.code) > 50000:
        raise HTTPException(status_code=400, detail="Code too long (max 50,000 characters)")

    return StreamingResponse(
        stream_review(request.code, request.language),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-code-review"}

@app.post("/fix")
async def fix_issue(request: dict):
    code = request.get("code", "")
    issue = request.get("issue", "")
    language = request.get("language", "auto")

    if not code or not issue:
        raise HTTPException(status_code=400, detail="Code and issue required")

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": f"""
You are an expert software engineer.

Fix the issue described in the code below.

Return JSON ONLY in this format:
{{"fixed_code":"...", "explanation":"..."}}

Language: {language}

Issue:
{issue}

Code:
{code}
"""
                }
            ],
             response_format={"type": "json_object"},
            max_tokens=1000,
            temperature=0.2,
            extra_headers={
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "AI Code Review Bot",
            }
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()

        return json.loads(content)

    except Exception as e:
        logger.error(f"Fix endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

 