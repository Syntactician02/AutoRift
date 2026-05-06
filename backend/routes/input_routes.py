from fastapi import APIRouter
from models.task_model import InjectedInput
from services.state_manager import state

router = APIRouter()

@router.post("/pause")
async def pause():
    state.pause()
    return {"status": "paused"}

@router.post("/resume")
async def resume():
    state.resume()
    return {"status": "resumed"}

@router.post("/input")
async def inject_input(payload: InjectedInput):
    state.inject_input(payload.instruction)
    return {"status": "input_received", "instruction": payload.instruction}