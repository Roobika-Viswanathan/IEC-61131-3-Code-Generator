from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core.dependencies import get_current_user
from app.models.session import (
    CreateSessionRequest, UpdateSessionRequest, AddMessageRequest,
    SessionResponse, SessionListResponse, SessionMessagesResponse,
    ChatMessage
)
from app.models.chat import ChatResponse
from app.services.firestore_service import firestore_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/debug/firestore")
async def debug_firestore(current_user: dict = Depends(get_current_user)):
    """Debug endpoint to test Firestore connection"""
    try:
        user_id = current_user.get("uid")
        
        # Test if Firestore is available
        if not firestore_service.is_available():
            return {"error": "Firestore not available", "user_id": user_id}
        
        # Test simple query
        try:
            collection_ref = firestore_service.db.collection("chat_sessions")
            count = 0
            for doc in collection_ref.limit(1).stream():
                count += 1
                break
            
            return {
                "firestore_available": True,
                "user_id": user_id,
                "test_query_success": True,
                "message": "Firestore is working correctly"
            }
        except Exception as e:
            return {
                "firestore_available": True,
                "user_id": user_id,
                "test_query_success": False,
                "error": str(e)
            }
            
    except Exception as e:
        return {"error": f"Debug failed: {str(e)}"}

@router.post("/sessions", response_model=dict)
async def create_chat_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new chat session"""
    try:
        session_id = firestore_service.create_chat_session(
            user_id=current_user.get("uid"),
            title=request.title
        )
        return {"session_id": session_id, "message": "Session created successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )

@router.get("/sessions", response_model=SessionListResponse)
async def get_user_sessions(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get all chat sessions for the current user"""
    try:
        user_id = current_user.get("uid")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User ID not found in token"
            )
        
        sessions = firestore_service.get_user_sessions(
            user_id=user_id,
            limit=limit
        )
        return SessionListResponse(sessions=sessions, total=len(sessions))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error in get_user_sessions endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sessions: {str(e)}"
        )

@router.get("/sessions/{session_id}/messages", response_model=SessionMessagesResponse)
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = 100
):
    """Get all messages for a specific chat session"""
    try:
        messages = firestore_service.get_session_messages(
            session_id=session_id,
            user_id=current_user.get("uid"),
            limit=limit
        )
        return SessionMessagesResponse(
            session_id=session_id,
            messages=messages,
            total=len(messages)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )

@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message_to_session(
    session_id: str,
    request: AddMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to a specific chat session and get AI response"""
    try:
        user_id = current_user.get("uid")
        
        # Verify AI service is available
        if not gemini_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini AI service not available"
            )
        
        # Add user message to session
        firestore_service.add_message_to_session(
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=request.message
        )
        
        # Get conversation history from Firestore
        messages = firestore_service.get_session_messages(
            session_id=session_id,
            user_id=user_id,
            limit=20  # Last 20 messages for context
        )
        
        # Convert to format expected by Gemini service
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in messages[:-1]  # Exclude the just-added user message
        ]
        
        # Get AI response
        ai_response = gemini_service.chat(
            message=request.message,
            conversation_history=conversation_history
        )
        
        # Add AI response to session
        firestore_service.add_message_to_session(
            session_id=session_id,
            user_id=user_id,
            role="assistant",
            content=ai_response
        )
        
        return ChatResponse(response=ai_response, success=True)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error in send_message_to_session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

@router.put("/sessions/{session_id}", response_model=dict)
async def update_session_title(
    session_id: str,
    request: UpdateSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update the title of a chat session"""
    try:
        if not request.title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title is required"
            )
        
        success = firestore_service.update_session_title(
            session_id=session_id,
            user_id=current_user.get("uid"),
            title=request.title
        )
        
        if success:
            return {"message": "Session title updated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update session title"
            )
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/sessions/{session_id}", response_model=dict)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a chat session and all its messages"""
    try:
        success = firestore_service.delete_session(
            session_id=session_id,
            user_id=current_user.get("uid")
        )
        
        if success:
            return {"message": "Session deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete session"
            )
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
