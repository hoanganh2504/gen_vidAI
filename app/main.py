import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import videos
from app.core.config import settings
from app.db.database import init_db
from app.services import video_job_service

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
frontend_dist = Path("gen_vidAI/frontend/dist")
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend-assets")
templates = Jinja2Templates(directory="app/templates")
app.include_router(videos.router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Du lieu khong hop le. Vui long kiem tra lai.",
            },
        },
    )


@app.on_event("startup")
async def startup_event():
    init_db()
    await video_job_service.recover_pending_jobs()


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    frontend_index = frontend_dist / "index.html"
    if frontend_index.exists():
        return FileResponse(frontend_index)
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "mock_mode": settings.KLING_MOCK_MODE},
    )


@app.get("/favicon.svg")
async def favicon():
    path = frontend_dist / "favicon.svg"
    if path.exists():
        return FileResponse(path, media_type="image/svg+xml")
    return FileResponse("gen_vidAI/frontend/public/favicon.svg", media_type="image/svg+xml")


@app.get("/icons.svg")
async def icons():
    path = frontend_dist / "icons.svg"
    if path.exists():
        return FileResponse(path, media_type="image/svg+xml")
    return FileResponse("gen_vidAI/frontend/public/icons.svg", media_type="image/svg+xml")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
