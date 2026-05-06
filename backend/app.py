from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.task_routes import router as task_router
from routes.input_routes import router as input_router
from routes.status_routes import router as status_router

app = FastAPI(title="AutoRift", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(task_router)
app.include_router(input_router)
app.include_router(status_router)

@app.get("/")
async def root():
    return {"message": "AutoRift backend is running. Go to /docs"}