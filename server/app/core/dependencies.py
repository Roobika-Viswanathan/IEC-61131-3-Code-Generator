from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.firebase_service import firebase_service

# Security
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify Firebase ID token and return user information
    """
    try:
        # Extract the token from the Authorization header
        id_token = credentials.credentials
        
        # Verify the ID token using Firebase service
        decoded_token = firebase_service.verify_id_token(id_token)
        
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
