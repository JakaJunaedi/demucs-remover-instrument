import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from .db import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_type = Column(String, index=True) # 'demucs' or 'youtube'
    status = Column(String, index=True) # 'queued', 'processing', 'completed', 'failed', 'paused'
    meta_data = Column(JSONB, default={})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
