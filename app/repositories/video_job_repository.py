from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.db.models import VideoJob


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_job(**kwargs) -> VideoJob:
    db = SessionLocal()
    job = VideoJob(**kwargs)
    db.add(job)
    db.commit()
    db.refresh(job)
    db.expunge(job)
    db.close()
    return job


def get_job(job_id: int) -> VideoJob | None:
    db = SessionLocal()
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if job:
        db.expunge(job)
    db.close()
    return job


def update_job(job_id: int, **updates) -> VideoJob | None:
    db = SessionLocal()
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if not job:
        db.close()
        return None
    updates["updated_at"] = utc_now()
    if updates.get("status") == "completed" and not updates.get("completed_at"):
        updates["completed_at"] = utc_now()
    for key, value in updates.items():
        setattr(job, key, value)
    db.add(job)
    db.commit()
    db.refresh(job)
    db.expunge(job)
    db.close()
    return job


def list_jobs(limit: int = 100, offset: int = 0) -> list[VideoJob]:
    db = SessionLocal()
    rows = db.query(VideoJob).order_by(VideoJob.id.desc()).offset(offset).limit(limit).all()
    for row in rows:
        db.expunge(row)
    db.close()
    return rows


def delete_job(job_id: int) -> bool:
    db = SessionLocal()
    job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
    if not job:
        db.close()
        return False
    db.delete(job)
    db.commit()
    db.close()
    return True
