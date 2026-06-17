import asyncio
import logging
import os
import time
from pathlib import Path

from app.core.config import settings
from app.repositories.video_job_repository import get_job, list_jobs, update_job
from app.services.kling_client import KlingClient, KlingClientError
from app.services.prompt_optimizer import optimize_video_prompt
from app.services.video_downloader import download_video_stream

logger = logging.getLogger(__name__)

active_job_tasks: dict[int, asyncio.Task] = {}
_active_lock = asyncio.Lock()
client = KlingClient()


async def _run_job(job_id: int) -> None:
    try:
        job = get_job(job_id)
        if not job:
            return

        update_job(job_id, status="submitting", progress=0.05, error_code=None, error_message=None)
        prompt_result = await optimize_video_prompt(job.content, job.style, job.duration, job.aspect_ratio)
        update_job(
            job_id,
            optimized_prompt=prompt_result.optimized_prompt,
            negative_prompt=prompt_result.negative_prompt,
            progress=0.10,
        )

        try:
            create_result = await client.create_text_to_video(
                prompt_result.optimized_prompt,
                prompt_result.negative_prompt,
                job.duration,
                job.aspect_ratio,
            )
        except KlingClientError as exc:
            update_job(job_id, status="failed", error_code=exc.code, error_message=str(exc), progress=1.0)
            return

        update_job(
            job_id,
            provider_task_id=create_result.provider_task_id,
            provider_status="created",
            status="processing",
            progress=0.15,
        )

        started_at = time.monotonic()
        timeout_seconds = settings.KLING_MAX_POLL_MINUTES * 60
        while True:
            try:
                task_result = await client.get_task_status(create_result.provider_task_id)
            except KlingClientError as exc:
                update_job(job_id, status="failed", error_code=exc.code, error_message=str(exc), progress=1.0)
                return

            update_job(
                job_id,
                provider_status=task_result.status,
                progress=max(0.15, min(task_result.progress, 0.95)),
            )

            if task_result.status == "completed" and task_result.video_url:
                update_job(
                    job_id,
                    status="downloading",
                    provider_video_url=task_result.video_url,
                    progress=0.95,
                )
                destination = os.path.join(settings.DOWNLOAD_DIR, f"{job_id}.mp4")
                try:
                    await download_video_stream(
                        task_result.video_url,
                        destination,
                        timeout=settings.KLING_REQUEST_TIMEOUT,
                    )
                except Exception as exc:
                    logger.exception("Video download failed for job %s", job_id)
                    update_job(
                        job_id,
                        status="failed",
                        error_code="VIDEO_DOWNLOAD_FAILED",
                        error_message=str(exc),
                        progress=1.0,
                    )
                    return
                update_job(job_id, status="completed", local_video_path=destination, progress=1.0)
                return

            if task_result.status == "failed":
                update_job(
                    job_id,
                    status="failed",
                    error_code="KLING_TASK_FAILED",
                    error_message="Provider task failed.",
                    progress=1.0,
                )
                return

            if time.monotonic() - started_at > timeout_seconds:
                update_job(
                    job_id,
                    status="failed",
                    error_code="KLING_TIMEOUT",
                    error_message="Polling timeout.",
                    progress=1.0,
                )
                return

            await asyncio.sleep(settings.KLING_POLL_INTERVAL_SECONDS)
    except Exception as exc:
        logger.exception("Unexpected job failure for job %s", job_id)
        update_job(job_id, status="failed", error_code="INTERNAL_ERROR", error_message=str(exc), progress=1.0)
    finally:
        active_job_tasks.pop(job_id, None)


async def start_job_background(job_id: int) -> asyncio.Task | None:
    async with _active_lock:
        existing = active_job_tasks.get(job_id)
        if existing and not existing.done():
            return existing
        task = asyncio.create_task(_run_job(job_id))
        active_job_tasks[job_id] = task
        return task


async def recover_pending_jobs() -> None:
    Path(settings.DOWNLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.MOCK_VIDEO_PATH).parent.mkdir(parents=True, exist_ok=True)
    for job in list_jobs(limit=1000):
        if job.status in ("queued", "submitting", "processing", "downloading"):
            await start_job_background(job.id)
