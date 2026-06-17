from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class VideoJob(Base):
    __tablename__ = "video_jobs"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    style = Column(String(50), nullable=False)
    duration = Column(Integer, nullable=False)
    aspect_ratio = Column(String(10), nullable=False)

    optimized_prompt = Column(Text, nullable=True)
    negative_prompt = Column(Text, nullable=True)

    provider = Column(String(50), default="kling")
    provider_task_id = Column(String(200), nullable=True)
    provider_status = Column(String(50), nullable=True)

    status = Column(String(50), default="queued")
    progress = Column(Float, default=0.0)

    provider_video_url = Column(String(1000), nullable=True)
    local_video_path = Column(String(1000), nullable=True)

    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)

    retry_of_job_id = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
