import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from api.router import router
from services.cleanup import delete_old_tasks

startup_time = time.time()
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup Background Scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(delete_old_tasks, "interval", hours=1)
    scheduler.start()

    # Set max_workers=1 for CPU heavy Demucs
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=1)
    loop.set_default_executor(executor)
    
    yield
    
    executor.shutdown(wait=True)
    scheduler.shutdown()

app = FastAPI(title="Vocal Remover API", version="1.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"message": "Welcome to Vocal Remover API. Visit /docs for API documentation."}
