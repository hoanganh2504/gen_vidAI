from fastapi import HTTPException, Request, status

from app.core.config import settings


def authenticate_user(username: str, password: str) -> bool:
    return username == settings.AUTH_USERNAME and password == settings.AUTH_PASSWORD


def is_authenticated(request: Request) -> bool:
    return bool(request.session.get("user"))


def require_login(request: Request) -> str:
    if not is_authenticated(request):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return request.session["user"]
