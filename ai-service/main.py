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

# client = AsyncOpenAI(
#     api_key=OPENROUTER_API_KEY,
#     base_url="https://openrouter.ai/api/v1",
# )

# MODEL = "openrouter/free"
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing")

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-3.8-flash"

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


# async def stream_review(code: str, language: str) -> AsyncGenerator[str, None]:
    # user_message = f"Language: {language}\n\nCode to review:\n```{language}\n{code}\n```"

    # try:
         
    #     stream = await client.chat.completions.create(
    #         model=MODEL,
    #         messages=[
    #             {
    #                 "role": "system",
    #                 "content": REVIEW_SYSTEM_PROMPT + """
    #                     Additional requirements:
    #                     - Return only the final JSON object.
    #                     - Never include internal reasoning, analysis, or Markdown.
    #                     - Include all six required keys: bugs, style, security,
    #                     summary, score, and language.
    #                     - Use empty arrays when no issues are found.
    #                     - Ensure the JSON is complete and valid.
    #                     """
    #             },
    #             {
    #                 "role": "user",
    #                 "content": (
    #                     f"Language: {language}\n\n"
    #                     f"Code to review:\n{code}"
    #                 )
    #             }
    #         ],
    #         stream=True,
    #         max_tokens=2000,
    #         temperature=0.2,
    #         extra_headers={
    #             "HTTP-Referer": "http://localhost:5173",
    #             "X-Title": "AI Code Review Bot",
    #         }
    #     )

    #     async for chunk in stream:
    #         delta = chunk.choices[0].delta
    #         if delta.content:
    #             data = json.dumps({"chunk": delta.content, "done": False})
    #             yield f"data: {data}\n\n"
    #             await asyncio.sleep(0)

    #     yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"

    # except Exception as e:
    #     logger.error(f"Streaming error: {e}")
    #     error_data = json.dumps({"error": str(e), "done": True})
    #     yield f"data: {error_data}\n\n"
async def stream_review(code, language):
    try:
        stream = await client.aio.models.generate_content_stream(
            model=MODEL,
            contents=(
                f"Review this {language} code:\n\n"
                f"```{language}\n{code}\n```"
            ),
            config=types.GenerateContentConfig(
                system_instruction=REVIEW_SYSTEM_PROMPT,
                temperature=0.2,
                max_output_tokens=2000,
                response_mime_type="application/json",
            ),
        )

        async for chunk in stream:
            if chunk.text:
                data = json.dumps({
                    "chunk": chunk.text,
                    "done": False
                })
                yield f"data: {data}\n\n"

        yield f"data: {json.dumps({
            'chunk': '',
            'done': True
        })}\n\n"

    except Exception:
        logger.exception("Gemini review streaming failed")
        data = json.dumps({
            "error": "AI review failed. Please try again later.",
            "done": True
        })
        yield f"data: {data}\n\n"

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

    if not code.strip() or not issue.strip():
        raise HTTPException(
            status_code=400,
            detail="Code and issue required"
        )

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=(
                f"Language: {language}\n\n"
                f"Issue:\n{issue}\n\n"
                f"Code:\n{code}"
            ),
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are an expert software engineer. "
                    "Fix the specified issue with minimal changes. "
                    "Return only a valid JSON object with exactly "
                    "two keys: fixed_code and explanation. "
                    "Both values must be strings. Do not use "
                    "Markdown code fences."
                ),
                max_output_tokens=2000,
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

        content = (response.text or "").strip()

        if not content:
            logger.error("Gemini returned an empty fix response")
            raise HTTPException(
                status_code=502,
                detail="AI model returned an empty response. Try again."
            )

        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            logger.error("Invalid JSON returned by Gemini: %s", content)
            raise HTTPException(
                status_code=502,
                detail="AI returned invalid JSON. Please try again."
            )

        if not isinstance(result, dict):
            raise HTTPException(
                status_code=502,
                detail="AI returned an unexpected response format."
            )

        if (
            not isinstance(result.get("fixed_code"), str)
            or not isinstance(result.get("explanation"), str)
        ):
            raise HTTPException(
                status_code=502,
                detail="AI response is missing fixed_code or explanation."
            )

        return {
            "fixed_code": result["fixed_code"],
            "explanation": result["explanation"]
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("Gemini fix endpoint failed")
        raise HTTPException(
            status_code=502,
            detail="AI service request failed. Check the backend logs."
        )

# async def fix_issue(request: dict):
    # code = request.get("code", "")
    # issue = request.get("issue", "")
    # language = request.get("language", "auto")

    # if not code.strip() or not issue.strip():
    #     raise HTTPException(
    #         status_code=400,
    #         detail="Code and issue required"
    #     )

    # try:
    #     response = await client.chat.completions.create(
    #         model=MODEL,
    #         messages=[
    #             {
    #                 "role": "system",
    #                 "content": (
    #                     "You are an expert software engineer. "
    #                     "Fix the specified issue with minimal changes. "
    #                     "Return only a valid JSON object with exactly "
    #                     "two keys: fixed_code and explanation. "
    #                     "Both values must be strings. Do not use "
    #                     "Markdown code fences."
    #                 )
    #             },
    #             {
    #                 "role": "user",
    #                 "content": (
    #                     f"Language: {language}\n\n"
    #                     f"Issue:\n{issue}\n\n"
    #                     f"Code:\n{code}"
    #                 )
    #             }
    #         ],
    #         max_tokens=2000,
    #         temperature=0.2,
    #         extra_headers={
    #             "HTTP-Referer": "http://localhost:5173",
    #             "X-Title": "AI Code Review Bot",
    #         }
    #     )

    #     message = response.choices[0].message
    #     content = (message.content or "").strip()

    #     # Log diagnostic information if the model returns no text.
    #     if not content:
    #         logger.error(
    #             "Empty AI response. Model=%s, finish_reason=%s",
    #             MODEL,
    #             response.choices[0].finish_reason
    #         )
    #         raise HTTPException(
    #             status_code=502,
    #             detail="AI model returned an empty response. Try again."
    #         )

    #     # Remove Markdown fences if the model adds them.
    #     if content.startswith("```"):
    #         content = content.replace("```json", "", 1)
    #         content = content.replace("```", "").strip()

    #     try:
    #         result = json.loads(content)
    #     except json.JSONDecodeError:
    #         logger.error("Invalid JSON returned by AI: %s", content)
    #         raise HTTPException(
    #             status_code=502,
    #             detail="AI returned invalid JSON. Please try again."
    #         )

    #     if not isinstance(result, dict):
    #         raise HTTPException(
    #             status_code=502,
    #             detail="AI returned an unexpected response format."
    #         )

    #     if not isinstance(result.get("fixed_code"), str) or not isinstance(
    #         result.get("explanation"), str
    #     ):
    #         raise HTTPException(
    #             status_code=502,
    #             detail="AI response is missing fixed_code or explanation."
    #         )

    #     return result

    # except HTTPException:
    #     raise
    # except Exception:
    #     logger.exception("Fix endpoint failed")
    #     raise HTTPException(
    #         status_code=502,
    #         detail="AI service request failed. Check the backend logs."
    #     )



 