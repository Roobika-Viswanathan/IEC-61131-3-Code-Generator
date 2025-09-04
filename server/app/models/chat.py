from pydantic import BaseModel
from typing import Optional, List, Literal, Union

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

class StructuredResponse(BaseModel):
    type: Literal["text", "ladder", "plc-code"]
    content: str

class MultipleStructuredResponse(BaseModel):
    responses: List[StructuredResponse]

class ChatResponse(BaseModel):
    response: str
    structured_response: Optional[Union[StructuredResponse, MultipleStructuredResponse]] = None
    success: bool = True
