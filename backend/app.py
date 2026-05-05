from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.task_routes import router as task_router
from routes.input_routes import router as input_router
from routes.status_routes import router as status_router
from utils.logger import get_logger

logger = get_logger("autorift")

app = FastAPI(
    title="AutoRift Backend",
    description="AI-powered cross-platform task automation system.",
    version="1.0.0",
)

# Allow all origins for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route groups
app.include_router(task_router)
app.include_router(input_router)
app.include_router(status_router)


@app.get("/", tags=["Health"])
async def root():
    return {"message": "AutoRift backend is running. Visit /docs for API reference."}


@app.on_event("startup")
async def on_startup():
    logger.info("AutoRift backend starting up...")


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("AutoRift backend shutting down...")
    from execution.browser_engine import close_browser
    close_browser()