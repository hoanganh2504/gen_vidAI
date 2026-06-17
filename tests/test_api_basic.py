from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.database import init_db
from app.main import app
from app.repositories.video_job_repository import create_job

init_db()

client = TestClient(app)


def test_index_returns_html():
    response = client.get("/")
    assert response.status_code == 200
    assert "Food AI Video Generator" in response.text


def test_create_job_success():
    payload = {
        "content": "Quang cao ga ran gion",
        "style": "advertising",
        "duration": 5,
        "aspect_ratio": "9:16",
    }
    response = client.post("/api/videos/generate", json=payload)
    assert response.status_code == 202
    assert response.json()["success"] is True
    assert response.json()["data"]["id"]


def test_create_job_validation_error():
    payload = {"content": "ab", "style": "advertising", "duration": 5, "aspect_ratio": "9:16"}
    response = client.post("/api/videos/generate", json=payload)
    assert response.status_code == 422
    assert response.json()["success"] is False


def test_get_job_not_found():
    response = client.get("/api/videos/999999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "JOB_NOT_FOUND"


def test_history_returns_list():
    response = client.get("/api/videos")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_stream_unfinished_job_returns_error():
    job = create_job(content="Pizza", style="review", duration=5, aspect_ratio="1:1", status="processing")
    response = client.get(f"/api/videos/{job.id}/stream")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "VIDEO_FILE_NOT_FOUND"


def test_download_missing_file_returns_error():
    job = create_job(
        content="Pizza",
        style="review",
        duration=5,
        aspect_ratio="1:1",
        status="completed",
        local_video_path=str(Path(settings.DOWNLOAD_DIR) / "missing.mp4"),
    )
    response = client.get(f"/api/videos/{job.id}/download")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "VIDEO_FILE_NOT_FOUND"


def test_retry_failed_job():
    job = create_job(content="Steak", style="mukbang", duration=5, aspect_ratio="9:16", status="failed")
    response = client.post(f"/api/videos/{job.id}/retry")
    assert response.status_code == 202
    assert response.json()["success"] is True


def test_delete_job():
    job = create_job(content="Tea", style="cinematic", duration=5, aspect_ratio="16:9", status="failed")
    response = client.delete(f"/api/videos/{job.id}")
    assert response.status_code == 200
    assert response.json()["success"] is True
