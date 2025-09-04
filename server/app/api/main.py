from fastapi import APIRouter
from app.api import user, ai

api_router = APIRouter()

# Include all route modules
api_router.include_router(user.router)
api_router.include_router(ai.router)

# You can add more routers here as your application grows
# api_router.include_router(other_router)
