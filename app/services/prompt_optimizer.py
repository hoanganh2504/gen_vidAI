import json

import httpx

from app.core.config import settings
from app.services.food_prompt_templates import get_template
from app.services.prompt_builder import build_video_prompt
from app.schemas.video import PromptBuildResult


SYSTEM_PROMPT = (
    "You are a senior creative director for high-converting food advertising videos. "
    "Write one concise English prompt for a Kling text-to-video model. Focus on food only. "
    "Do not add people, faces, hands, logos, subtitles, watermarks, brand names, or on-screen text "
    "unless the user explicitly asks or the style is cooking. Output JSON only with keys optimized_prompt and negative_prompt."
)


async def optimize_video_prompt(
    content: str,
    style: str,
    duration: int,
    aspect_ratio: str,
    use_gpt_prompt: bool | None = None,
    prompt_template_id: str | None = None,
) -> PromptBuildResult:
    template = get_template(prompt_template_id)
    enriched_content = content.strip()
    if template:
        enriched_content = f"{template['content']}\nNguoi dung bo sung: {enriched_content}"

    fallback = build_video_prompt(enriched_content, style, duration, aspect_ratio)
    should_use_gpt = settings.USE_GPT_PROMPT_BUILDER if use_gpt_prompt is None else use_gpt_prompt
    if not should_use_gpt:
        return fallback
    if not settings.OPENAI_API_KEY:
        return fallback

    try:
        result = await _call_openai_prompt_builder(
            enriched_content,
            style,
            duration,
            aspect_ratio,
            fallback.negative_prompt,
        )
    except Exception:
        return fallback

    return PromptBuildResult(
        original_content=content.strip(),
        optimized_prompt=result.get("optimized_prompt") or fallback.optimized_prompt,
        negative_prompt=result.get("negative_prompt") or fallback.negative_prompt,
        style=style,
        duration=duration,
        aspect_ratio=aspect_ratio,
    )


async def _call_openai_prompt_builder(
    content: str,
    style: str,
    duration: int,
    aspect_ratio: str,
    fallback_negative_prompt: str | None,
) -> dict:
    user_prompt = {
        "food_video_request": content,
        "style": style,
        "duration_seconds": duration,
        "aspect_ratio": aspect_ratio,
        "requirements": [
            "main food subject",
            "marketing hook",
            "food action",
            "if style is cooking, show one professional chef cooking step by step in a clean kitchen",
            "camera angle and movement",
            "lighting",
            "background",
            "texture and appetite appeal",
            "realistic food physics",
        ],
        "negative_prompt_seed": fallback_negative_prompt,
    }
    payload = {
        "model": settings.OPENAI_MODEL,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
        ],
        "text": {"format": {"type": "json_object"}},
    }
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=settings.OPENAI_REQUEST_TIMEOUT) as client:
        response = await client.post("https://api.openai.com/v1/responses", headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()
    text = _extract_response_text(data)
    return json.loads(text)


def _extract_response_text(data: dict) -> str:
    if data.get("output_text"):
        return data["output_text"]
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"} and content.get("text"):
                return content["text"]
    raise ValueError("OpenAI response did not include output text")
