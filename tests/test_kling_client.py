import asyncio
from unittest.mock import AsyncMock, patch

import httpx

from app.core.config import settings
from app.services.kling_client import KlingClient


def test_mock_create_task():
    original_mock = settings.KLING_MOCK_MODE
    try:
        settings.KLING_MOCK_MODE = True
        client = KlingClient()
        result = asyncio.run(client.create_text_to_video("prompt", None, 5, "9:16"))
        assert result.provider_task_id.startswith("mock-")
    finally:
        settings.KLING_MOCK_MODE = original_mock


def test_mock_status_completes_for_existing_task():
    original_mock = settings.KLING_MOCK_MODE
    try:
        settings.KLING_MOCK_MODE = True
        client = KlingClient()
        result = asyncio.run(client.create_text_to_video("prompt", None, 5, "9:16"))
        client.mock_tasks[result.provider_task_id] -= 10
        status = asyncio.run(client.get_task_status(result.provider_task_id))
        assert status.status == "completed"
        assert status.video_url == "MOCK_VIDEO_URL"
    finally:
        settings.KLING_MOCK_MODE = original_mock


def test_build_jwt_has_three_parts():
    original_mock = settings.KLING_MOCK_MODE
    original_access = settings.KLING_ACCESS_KEY
    original_secret = settings.KLING_SECRET_KEY
    try:
        settings.KLING_MOCK_MODE = False
        settings.KLING_ACCESS_KEY = "ak"
        settings.KLING_SECRET_KEY = "sk"
        token = KlingClient()._build_jwt()
        assert len(token.split(".")) == 3
    finally:
        settings.KLING_MOCK_MODE = original_mock
        settings.KLING_ACCESS_KEY = original_access
        settings.KLING_SECRET_KEY = original_secret


def test_real_create_task_parses_task_id():
    original = {
        "mock": settings.KLING_MOCK_MODE,
        "ak": settings.KLING_ACCESS_KEY,
        "sk": settings.KLING_SECRET_KEY,
        "base": settings.KLING_API_BASE_URL,
        "model": settings.KLING_MODEL_NAME,
    }
    try:
        settings.KLING_MOCK_MODE = False
        settings.KLING_ACCESS_KEY = "ak"
        settings.KLING_SECRET_KEY = "sk"
        settings.KLING_API_BASE_URL = "https://example.test"
        settings.KLING_MODEL_NAME = "kling-v1-6"
        response = httpx.Response(200, json={"code": 0, "data": {"task_id": "task-123"}})
        with patch("httpx.AsyncClient.request", new=AsyncMock(return_value=response)):
            result = asyncio.run(KlingClient().create_text_to_video("prompt", None, 5, "9:16"))
        assert result.provider_task_id == "task-123"
    finally:
        settings.KLING_MOCK_MODE = original["mock"]
        settings.KLING_ACCESS_KEY = original["ak"]
        settings.KLING_SECRET_KEY = original["sk"]
        settings.KLING_API_BASE_URL = original["base"]
        settings.KLING_MODEL_NAME = original["model"]


def test_real_status_extracts_video_url():
    original = {
        "mock": settings.KLING_MOCK_MODE,
        "ak": settings.KLING_ACCESS_KEY,
        "sk": settings.KLING_SECRET_KEY,
        "base": settings.KLING_API_BASE_URL,
        "model": settings.KLING_MODEL_NAME,
    }
    try:
        settings.KLING_MOCK_MODE = False
        settings.KLING_ACCESS_KEY = "ak"
        settings.KLING_SECRET_KEY = "sk"
        settings.KLING_API_BASE_URL = "https://example.test"
        settings.KLING_MODEL_NAME = "kling-v1-6"
        payload = {
            "code": 0,
            "data": {
                "task_status": "succeed",
                "task_result": {"videos": [{"url": "https://cdn.example/video.mp4"}]},
            },
        }
        response = httpx.Response(200, json=payload)
        with patch("httpx.AsyncClient.request", new=AsyncMock(return_value=response)):
            result = asyncio.run(KlingClient().get_task_status("task-123"))
        assert result.status == "completed"
        assert result.video_url == "https://cdn.example/video.mp4"
    finally:
        settings.KLING_MOCK_MODE = original["mock"]
        settings.KLING_ACCESS_KEY = original["ak"]
        settings.KLING_SECRET_KEY = original["sk"]
        settings.KLING_API_BASE_URL = original["base"]
        settings.KLING_MODEL_NAME = original["model"]
