import logging
from pathlib import Path

from fastapi import FastAPI, Form, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from app.api import videos
from app.core.auth import authenticate_user, is_authenticated
from app.core.config import settings
from app.db.database import init_db
from app.services import video_job_service

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY,
    max_age=14 * 24 * 60 * 60,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
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


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    if is_authenticated(request):
        return RedirectResponse("/", status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login", response_class=HTMLResponse)
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    if not authenticate_user(username, password):
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Tên đăng nhập hoặc mật khẩu không đúng."},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    request.session["user"] = username
    return RedirectResponse("/", status_code=status.HTTP_302_FOUND)


@app.get("/logout")
async def logout(request: Request):
    request.session.pop("user", None)
    return RedirectResponse("/login", status_code=status.HTTP_302_FOUND)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    if not is_authenticated(request):
        return RedirectResponse("/login", status_code=status.HTTP_302_FOUND)

    return templates.TemplateResponse(
        "index.html",
        {"request": request, "mock_mode": settings.KLING_MOCK_MODE},
    )


@app.get("/favicon.svg")
async def favicon():
    path = Path("app/static/favicon.svg")
    if path.exists():
        return FileResponse(path, media_type="image/svg+xml")
    return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "favicon not found"}})


@app.get("/icons.svg")
async def icons():
    path = Path("app/static/icons.svg")
    if path.exists():
        return FileResponse(path, media_type="image/svg+xml")
    return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "icons not found"}})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
