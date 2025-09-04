from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
import json

# Load environment variables
load_dotenv()

app = FastAPI(title="Firebase Auth API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin SDK
try:
    # Check if Firebase app is already initialized
    firebase_admin.get_app()
    print("Firebase Admin SDK already initialized.")
except ValueError:
    # App doesn't exist, so initialize it
    try:
        # For development, you can use a service account key file
        # In production, you should use environment variables or other secure methods
        if os.path.exists("firebase-service-account.json"):
            cred = credentials.Certificate("firebase-service-account.json")
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized with service account.")
        else:
            # Initialize with environment variables (for production)
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized with default credentials.")
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        print("Warning: Firebase Admin SDK not initialized. Authentication will not work.")
except Exception as e:
    print(f"Error checking Firebase app status: {e}")

# Security
security = HTTPBearer()

# Pydantic models
class UserResponse(BaseModel):
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    email_verified: bool = False

class MessageResponse(BaseModel):
    message: str
    user: Optional[UserResponse] = None

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify Firebase ID token and return user information
    """
    try:
        # Extract the token from the Authorization header
        id_token = credentials.credentials
        
        # Verify the ID token
        decoded_token = auth.verify_id_token(id_token)
        
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {"message": "Firebase Auth API is running!"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy", "service": "Firebase Auth API"}

@app.get("/protected", response_model=MessageResponse)
async def protected_route(current_user: dict = Depends(get_current_user)):
    """
    Protected endpoint that requires authentication
    """
    user_info = UserResponse(
        uid=current_user.get("uid"),
        email=current_user.get("email"),
        name=current_user.get("name"),
        picture=current_user.get("picture"),
        email_verified=current_user.get("email_verified", False)
    )
    
    return MessageResponse(
        message=f"Hello {current_user.get('name', 'User')}! This is a protected endpoint.",
        user=user_info
    )

@app.get("/user/profile", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user's profile information
    """
    return UserResponse(
        uid=current_user.get("uid"),
        email=current_user.get("email"),
        name=current_user.get("name"),
        picture=current_user.get("picture"),
        email_verified=current_user.get("email_verified", False)
    )

@app.post("/user/verify-token")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """
    Verify if the provided token is valid
    """
    return {
        "valid": True,
        "uid": current_user.get("uid"),
        "email": current_user.get("email")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

