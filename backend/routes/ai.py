"""
AI routes - Handle AI-related operations and analytics
"""

from fastapi import APIRouter, HTTPException, Body
from services.ai_engine import ai_engine_service
from utils.logger import logger

router = APIRouter()

@router.post("/analyze")
async def analyze_steps(steps: list = Body(...)):
    """Analyze recorded steps using AI"""
    try:
        analysis = ai_engine_service.analyze(steps)
        logger.info("Steps analyzed")
        return {"status": "analyzed", "analysis": analysis}
    except Exception as e:
        logger.error(f"Error analyzing steps: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def optimize_steps(steps: list = Body(...)):
    """Optimize recorded steps using AI"""
    try:
        optimized = ai_engine_service.optimize(steps)
        logger.info("Steps optimized")
        return {"status": "optimized", "steps": optimized}
    except Exception as e:
        logger.error(f"Error optimizing steps: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-description")
async def generate_description(steps: list = Body(...)):
    """Generate description for recorded steps using AI"""
    try:
        description = ai_engine_service.generate_description(steps)
        logger.info("Description generated")
        return {"status": "generated", "description": description}
    except Exception as e:
        logger.error(f"Error generating description: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
