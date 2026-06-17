from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, validator

from app.core.constants import ALLOWED_ASPECT_RATIOS, ALLOWED_DURATIONS, STYLE_LABELS


class VideoCreate(BaseModel):
    content: str = Field(..., min_length=3, max_length=500)
    style: str
    duration: int
    aspect_ratio: str
    use_gpt_prompt: Optional[bool] = None
    prompt_template_id: Optional[str] = None

    @validator("content")
    def content_trimmed(cls, v: str) -> str:
        value = v.strip()
        if len(value) < 3:
            raise ValueError("Content must be at least 3 characters")
        return value

    @validator("style")
    def style_must_be_valid(cls, v: str) -> str:
        if v not in STYLE_LABELS:
            raise ValueError("Invalid style")
        return v

    @validator("duration")
    def duration_allowed(cls, v: int) -> int:
        if v not in ALLOWED_DURATIONS:
            raise ValueError("Invalid duration")
        return v

    @validator("aspect_ratio")
    def aspect_allowed(cls, v: str) -> str:
        if v not in ALLOWED_ASPECT_RATIOS:
            raise ValueError("Invalid aspect ratio")
        return v


class PromptBuildResult(BaseModel):
    original_content: str
    optimized_prompt: str
    negative_prompt: Optional[str] = None
    style: str
    duration: int
    aspect_ratio: str


class VideoResponse(BaseModel):
    id: int
    content: str
    style: str
    duration: int
    aspect_ratio: str
    status: str
    provider_status: Optional[str] = None
    progress: float = 0.0
    local_video_path: Optional[str] = None
    provider_video_url: Optional[str] = None
    optimized_prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retry_of_job_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ListResponse(BaseModel):
    success: bool
    data: List[VideoResponse]
