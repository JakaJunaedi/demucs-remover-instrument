import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.router import router

startup_time = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Set max_workers=1 for CPU heavy Demucs
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=1)
    loop.set_default_executor(executor)
    yield
    executor.shutdown(wait=True)

app = FastAPI(title="Vocal Remover API", version="1.1.0", lifespan=lifespan)

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
