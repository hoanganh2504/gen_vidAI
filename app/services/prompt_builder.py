from app.core.constants import ALLOWED_ASPECT_RATIOS, ALLOWED_DURATIONS
from app.schemas.video import PromptBuildResult


STYLE_TEMPLATES = {
    "advertising": "premium commercial food advertisement, hero product shot, dramatic studio lighting, appetizing close-up, slow camera movement, crispy and glossy food texture, shallow depth of field, clean commercial composition",
    "mukbang": "realistic mukbang food video, close-up eating setup, large appetizing food portion, juicy texture, natural food movement, social media food content, warm indoor lighting",
    "review": "social media food review style, dynamic close-up shots, casual restaurant atmosphere, realistic food texture, handheld camera feeling, engaging TikTok food content",
    "cinematic": "cinematic food film, macro close-up, dramatic camera movement, volumetric lighting, premium restaurant atmosphere, high detail, shallow depth of field, slow motion",
    "asmr": "food ASMR visual, extreme close-up, crispy texture, sizzling food, cutting and pouring motions, realistic food physics, minimal clean background, high-detail macro footage",
    "cooking": "realistic cooking tutorial video, professional chef cooking in a clean modern kitchen, step-by-step recipe preparation, natural hand movements, clear ingredient handling, warm kitchen lighting, practical overhead and close-up shots",
}

NEGATIVE_PROMPT = (
    "text, captions, subtitles, watermark, logo, fake brand, faces, people, hands, "
    "low quality, distorted food, deformed ingredients, unrelated objects, unrealistic motion"
)


def build_video_prompt(
    content: str,
    style: str,
    duration: int,
    aspect_ratio: str,
) -> PromptBuildResult:
    original = content.strip()
    if len(original) < 3:
        raise ValueError("Content must be at least 3 characters")
    if style not in STYLE_TEMPLATES:
        raise ValueError("Invalid style")
    if duration not in ALLOWED_DURATIONS:
        raise ValueError("Invalid duration")
    if aspect_ratio not in ALLOWED_ASPECT_RATIOS:
        raise ValueError("Invalid aspect ratio")

    if style == "cooking":
        optimized_prompt = (
            f"{STYLE_TEMPLATES[style]}. Recipe and cooking instructions: {original}. "
            "Show one professional chef from chest-down or tasteful medium shots preparing the dish step by step. "
            "Include realistic ingredient prep, cutting, mixing, seasoning, pan frying or plating only when relevant to the recipe. "
            "Use alternating overhead shots, close-ups of ingredients, gentle handheld kitchen camera movement, "
            "warm natural kitchen lighting, clean counters, realistic steam and food texture. "
            f"Format for {aspect_ratio} composition as requested. Target duration: {duration} seconds. "
            "Avoid on-screen text, logos, brand marks, distorted hands, extra people, messy background, and unrealistic cooking physics."
        )
        negative_prompt = (
            "text, captions, subtitles, watermark, logo, fake brand, distorted hands, extra fingers, "
            "extra people, deformed face, messy kitchen, low quality, distorted food, unrealistic motion"
        )
    else:
        optimized_prompt = (
            f"{STYLE_TEMPLATES[style]}. Main food subject: {original}. "
            "Show a clear food action such as steam rising, sauce pouring, sizzling, cutting, "
            "or a slow reveal only when it matches the subject. Use macro and close-up camera angles, "
            "slow push-in or gentle orbit camera movement, realistic lighting, appetizing texture, "
            "clean food-focused background, high detail, natural food physics. "
            f"Format for {aspect_ratio} composition as requested. Target duration: {duration} seconds. "
            "Do not add people, faces, hands, text, logos, or brand marks unless explicitly requested."
        )
        negative_prompt = NEGATIVE_PROMPT

    return PromptBuildResult(
        original_content=original,
        optimized_prompt=optimized_prompt,
        negative_prompt=negative_prompt,
        style=style,
        duration=duration,
        aspect_ratio=aspect_ratio,
    )
