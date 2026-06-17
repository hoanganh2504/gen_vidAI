import asyncio
import base64
import hashlib
import hmac
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from app.core.config import settings


class KlingClientError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


@dataclass
class KlingCreateResult:
    provider_task_id: str


@dataclass
class KlingTaskResult:
    status: str
    progress: float = 0.0
    video_url: Optional[str] = None


class KlingClient:
    create_path = "/v1/videos/text2video"
    status_path_template = "/v1/videos/text2video/{task_id}"
    retry_status_codes = {429, 500, 502, 503, 504}

    def __init__(self):
        self.mock_tasks: dict[str, float] = {}

    async def create_text_to_video(
        self,
        prompt: str,
        negative_prompt: Optional[str],
        duration: int,
        aspect_ratio: str,
    ) -> KlingCreateResult:
        if settings.KLING_MOCK_MODE:
            task_id = f"mock-{uuid.uuid4()}"
            self.mock_tasks[task_id] = time.monotonic()
            await asyncio.sleep(1)
            return KlingCreateResult(provider_task_id=task_id)

        self._validate_real_config()
        payload = {
            "model_name": settings.KLING_MODEL_NAME,
            "prompt": prompt,
            "negative_prompt": negative_prompt or "",
            "aspect_ratio": aspect_ratio,
            "duration": str(duration),
            "mode": "std",
            "cfg_scale": 0.5,
        }
        data = await self._request("POST", self.create_path, json_body=payload)
        task_id = self._get_nested(data, "data", "task_id") or self._get_nested(data, "data", "id")
        if not task_id:
            raise KlingClientError("KLING_BAD_REQUEST", "Kling response did not include a task id.")
        return KlingCreateResult(provider_task_id=str(task_id))

    async def get_task_status(self, provider_task_id: str) -> KlingTaskResult:
        if settings.KLING_MOCK_MODE:
            started_at = self.mock_tasks.setdefault(provider_task_id, time.monotonic() - 4)
            elapsed = time.monotonic() - started_at
            await asyncio.sleep(0)
            if elapsed < 2:
                return KlingTaskResult(status="processing", progress=0.35)
            if elapsed < 4:
                return KlingTaskResult(status="processing", progress=0.75)
            return KlingTaskResult(status="completed", progress=1.0, video_url="MOCK_VIDEO_URL")

        self._validate_real_config()
        path = self.status_path_template.format(task_id=provider_task_id)
        data = await self._request("GET", path)
        task_data = data.get("data") or {}
        provider_status = str(task_data.get("task_status") or "").lower()
        status_message = task_data.get("task_status_msg") or task_data.get("message") or ""

        if provider_status in {"submitted", "queued", "created", "pending"}:
            return KlingTaskResult(status="processing", progress=0.2)
        if provider_status in {"processing", "running"}:
            return KlingTaskResult(status="processing", progress=0.65)
        if provider_status in {"succeed", "success", "completed"}:
            video_url = self._extract_video_url(task_data)
            if not video_url:
                raise KlingClientError("KLING_TASK_FAILED", "Kling task succeeded but no video URL was returned.")
            return KlingTaskResult(status="completed", progress=1.0, video_url=video_url)
        if provider_status in {"failed", "fail", "canceled", "cancelled"}:
            raise KlingClientError("KLING_TASK_FAILED", status_message or "Kling task failed.")

        return KlingTaskResult(status="processing", progress=0.5)

    def _validate_real_config(self) -> None:
        missing = [
            name
            for name, value in {
                "KLING_ACCESS_KEY": settings.KLING_ACCESS_KEY,
                "KLING_SECRET_KEY": settings.KLING_SECRET_KEY,
                "KLING_API_BASE_URL": settings.KLING_API_BASE_URL,
                "KLING_MODEL_NAME": settings.KLING_MODEL_NAME,
            }.items()
            if not value
        ]
        if missing:
            raise KlingClientError(
                "KLING_REAL_API_NOT_CONFIGURED",
                f"Missing real Kling configuration: {', '.join(missing)}",
            )

    async def _request(self, method: str, path: str, json_body: dict[str, Any] | None = None) -> dict[str, Any]:
        base_url = str(settings.KLING_API_BASE_URL).rstrip("/")
        url = f"{base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self._build_jwt()}",
            "Content-Type": "application/json",
        }
        last_error: Exception | None = None

        for attempt in range(4):
            try:
                async with httpx.AsyncClient(timeout=settings.KLING_REQUEST_TIMEOUT) as client:
                    response = await client.request(method, url, headers=headers, json=json_body)
                if response.status_code in self.retry_status_codes and attempt < 3:
                    await asyncio.sleep(2**attempt)
                    continue
                return self._parse_response(response)
            except (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError) as exc:
                last_error = exc
                if attempt < 3:
                    await asyncio.sleep(2**attempt)
                    continue
                raise KlingClientError("KLING_NETWORK_ERROR", "Could not connect to Kling API.") from exc

        raise KlingClientError("KLING_NETWORK_ERROR", str(last_error or "Unknown Kling network error."))

    def _parse_response(self, response: httpx.Response) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError as exc:
            raise KlingClientError("KLING_BAD_REQUEST", "Kling returned a non-JSON response.") from exc

        if response.status_code in {401, 403}:
            raise KlingClientError("KLING_AUTH_ERROR", "Kling authentication failed.")
        if response.status_code == 429:
            raise KlingClientError("KLING_RATE_LIMIT", self._safe_provider_message(payload))
        if response.status_code >= 400:
            raise KlingClientError("KLING_BAD_REQUEST", self._safe_provider_message(payload))

        code = payload.get("code")
        if code not in (None, 0, "0"):
            provider_code = str(code)
            message = self._safe_provider_message(payload)
            if provider_code in {"1102", "1103", "1002"}:
                raise KlingClientError("KLING_AUTH_ERROR", message)
            if provider_code in {"1301", "1302"}:
                raise KlingClientError("KLING_RATE_LIMIT", message)
            if provider_code in {"1200", "1201"}:
                raise KlingClientError("KLING_INSUFFICIENT_BALANCE", message)
            if provider_code in {"5000", "5001"}:
                raise KlingClientError("KLING_CONTENT_REJECTED", message)
            raise KlingClientError("KLING_BAD_REQUEST", message)

        return payload

    def _build_jwt(self) -> str:
        now = int(time.time())
        header = {"alg": "HS256", "typ": "JWT"}
        payload = {
            "iss": settings.KLING_ACCESS_KEY,
            "exp": now + 1800,
            "nbf": now - 5,
        }
        signing_input = f"{self._b64_json(header)}.{self._b64_json(payload)}"
        signature = hmac.new(
            str(settings.KLING_SECRET_KEY).encode("utf-8"),
            signing_input.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return f"{signing_input}.{self._b64(signature)}"

    @staticmethod
    def _b64_json(value: dict[str, Any]) -> str:
        raw = json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        return KlingClient._b64(raw)

    @staticmethod
    def _b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    @staticmethod
    def _safe_provider_message(payload: dict[str, Any]) -> str:
        return str(payload.get("message") or payload.get("msg") or "Kling API request failed.")

    @staticmethod
    def _get_nested(payload: dict[str, Any], *keys: str) -> Any:
        current: Any = payload
        for key in keys:
            if not isinstance(current, dict):
                return None
            current = current.get(key)
        return current

    @staticmethod
    def _extract_video_url(task_data: dict[str, Any]) -> str | None:
        result = task_data.get("task_result") or {}
        videos = result.get("videos") or []
        if videos and isinstance(videos[0], dict):
            return videos[0].get("url")
        if isinstance(result, dict):
            return result.get("video_url") or result.get("url")
        return task_data.get("video_url") or task_data.get("url")
