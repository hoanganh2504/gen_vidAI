import os
import shutil
from pathlib import Path

import httpx

from app.core.config import settings


def ensure_inside_download_dir(path: str) -> Path:
    target = Path(path).resolve()
    root = Path(settings.DOWNLOAD_DIR).resolve()
    if root not in target.parents and target != root:
        raise ValueError("Destination path is outside download directory")
    return target


async def download_video_stream(url: str, dest_path: str, timeout: int = 60) -> None:
    target = ensure_inside_download_dir(dest_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temp_path = target.with_suffix(".part")

    try:
        if url == "MOCK_VIDEO_URL":
            sample = Path(settings.MOCK_VIDEO_PATH)
            if not sample.exists():
                raise FileNotFoundError(
                    "Mock sample video not found. Add an MP4 file at data/mock/sample.mp4."
                )
            with sample.open("rb") as source, temp_path.open("wb") as dest:
                shutil.copyfileobj(source, dest, length=1024 * 1024)
            os.replace(temp_path, target)
            return

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "video" not in content_type and "octet-stream" not in content_type:
                    raise ValueError(f"Unexpected content type: {content_type or 'unknown'}")
                with temp_path.open("wb") as dest:
                    async for chunk in response.aiter_bytes(1024 * 1024):
                        if chunk:
                            dest.write(chunk)
        os.replace(temp_path, target)
    except Exception:
        if temp_path.exists():
            temp_path.unlink()
        raise
