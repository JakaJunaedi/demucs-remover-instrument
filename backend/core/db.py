import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Gunakan env vars atau fallback ke default docker-compose
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/vocal_remover"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def update_task_db(task_id: str, updates: dict):
    from .models import Task
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return
            
        if "status" in updates:
            task.status = updates["status"]
            
        # Merge dict for JSONB
        meta = dict(task.meta_data) if task.meta_data else {}
        meta.update(updates)
        task.meta_data = meta
        
        db.commit()
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db.close()
