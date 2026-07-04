from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse

from app.core.auth import require_login
from app.core.config import settings
from app.core.constants import ERROR_MESSAGES
from app.repositories.video_job_repository import create_job, delete_job, get_job, list_jobs
from app.schemas.video import VideoCreate
from app.services import video_job_service
from app.services.food_prompt_templates import list_templates

router = APIRouter(dependencies=[Depends(require_login)])


def error_response(code: str, status_code: int, message: str | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": {"code": code, "message": message or ERROR_MESSAGES.get(code, code)}},
    )


def job_to_dict(job) -> dict:
    return {
        "id": job.id,
        "content": job.content,
        "style": job.style,
        "duration": job.duration,
        "aspect_ratio": job.aspect_ratio,
        "optimized_prompt": job.optimized_prompt,
        "negative_prompt": job.negative_prompt,
        "provider": job.provider,
        "provider_task_id": job.provider_task_id,
        "provider_status": job.provider_status,
        "status": job.status,
        "progress": job.progress or 0.0,
        "provider_video_url": job.provider_video_url,
        "local_video_path": job.local_video_path,
        "error_code": job.error_code,
        "error_message": job.error_message,
        "retry_of_job_id": job.retry_of_job_id,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


def video_path_for_job(job) -> Path | None:
    if not job.local_video_path:
        return None
    path = Path(job.local_video_path).resolve()
    root = Path(settings.DOWNLOAD_DIR).resolve()
    if root not in path.parents and path != root:
        return None
    return path


@router.post("/videos/generate")
async def generate_video(payload: VideoCreate):
    content = payload.content
    from app.services.food_prompt_templates import get_template
    template = get_template(payload.prompt_template_id)
    if template and content.lower() in {"", "auto", "template"}:
        content = template["content"]
    job = create_job(
        content=content,
        style=payload.style,
        duration=payload.duration,
        aspect_ratio=payload.aspect_ratio,
        status="queued",
        progress=0.0,
    )
    await video_job_service.start_job_background(job.id)
    return JSONResponse(status_code=202, content={"success": True, "data": {"id": job.id}})


@router.get("/prompt-templates")
async def prompt_templates():
    return {"success": True, "data": list_templates()}


@router.get("/config")
async def app_config():
    return {
        "success": True,
        "data": {
            "mock_mode": settings.KLING_MOCK_MODE,
            "gpt_prompt_enabled": bool(settings.USE_GPT_PROMPT_BUILDER and settings.OPENAI_API_KEY),
            "kling_model": settings.KLING_MODEL_NAME,
            "allowed_durations": [5, 10],
            "long_form_note": "Kling V1-6 text-to-video supports 5s and 10s clips in this app. 30s/60s requires generating and stitching multiple clips.",
        },
    }


@router.get("/videos/{job_id}")
async def get_video(job_id: int):
    job = get_job(job_id)
    if not job:
        return error_response("JOB_NOT_FOUND", 404)
    return {"success": True, "data": job_to_dict(job)}


@router.get("/videos")
async def history(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    offset = (page - 1) * page_size
    rows = list_jobs(limit=page_size, offset=offset)
    return {"success": True, "data": [job_to_dict(job) for job in rows]}


@router.get("/videos/{job_id}/stream")
async def stream_video(job_id: int):
    job = get_job(job_id)
    if not job:
        return error_response("JOB_NOT_FOUND", 404)
    path = video_path_for_job(job)
    if not path or not path.exists() or job.status != "completed":
        return error_response("VIDEO_FILE_NOT_FOUND", 404)
    return FileResponse(path, media_type="video/mp4")


@router.get("/videos/{job_id}/download")
async def download_video(job_id: int):
    job = get_job(job_id)
    if not job:
        return error_response("JOB_NOT_FOUND", 404)
    path = video_path_for_job(job)
    if not path or not path.exists() or job.status != "completed":
        return error_response("VIDEO_FILE_NOT_FOUND", 404)
    return FileResponse(path, media_type="application/octet-stream", filename=f"food-ai-video-{job.id}.mp4")


@router.post("/videos/{job_id}/retry")
async def retry_job(job_id: int):
    job = get_job(job_id)
    if not job:
        return error_response("JOB_NOT_FOUND", 404)
    if job.status != "failed":
        return error_response("VALIDATION_ERROR", 400, "Chi retry duoc job da that bai.")
    new_job = create_job(
        content=job.content,
        style=job.style,
        duration=job.duration,
        aspect_ratio=job.aspect_ratio,
        retry_of_job_id=job.id,
        status="queued",
        progress=0.0,
    )
    await video_job_service.start_job_background(new_job.id)
    return JSONResponse(status_code=202, content={"success": True, "data": {"id": new_job.id}})


@router.delete("/videos/{job_id}")
async def delete_job_endpoint(job_id: int):
    job = get_job(job_id)
    if not job:
        return error_response("JOB_NOT_FOUND", 404)
    path = video_path_for_job(job)
    if path and path.exists():
        path.unlink()
    deleted = delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Database delete failed")
    return {"success": True, "data": {"id": job_id}}
