import google.generativeai as genai
from typing import List, Dict, Any
from app.core.config import settings

class GeminiService:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._initialize_gemini()
            self._initialized = True
    
    def _initialize_gemini(self):
        """Initialize Gemini AI service"""
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            print(f"Gemini configured with API key: {settings.GEMINI_API_KEY[:10]}...")
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            print("Warning: GEMINI_API_KEY not found in environment variables")
            self.model = None
    
    def is_available(self) -> bool:
        """Check if Gemini service is available"""
        return self.model is not None and bool(settings.GEMINI_API_KEY)
    
    def chat(self, message: str, conversation_history: List[Dict[str, str]] = None) -> str:
        """Send a message to Gemini and get a response"""
        if not self.is_available():
            raise ValueError("Gemini API key not configured")
        
        try:
            # Prepare conversation history for Gemini
            history = []
            if conversation_history:
                for msg in conversation_history[-10:]:  # Keep last 10 messages for context
                    if msg.get("role") == "user":
                        history.append({"role": "user", "parts": [msg.get("content", "")]})
                    elif msg.get("role") == "assistant":
                        history.append({"role": "model", "parts": [msg.get("content", "")]})
            
            # Start chat session with history
            chat = self.model.start_chat(history=history)
            
            # Send the current message
            response = chat.send_message(message)
            
            return response.text
            
        except Exception as e:
            raise ValueError(f"Failed to get response from Gemini: {str(e)}")

# Create singleton instance
gemini_service = GeminiService()
