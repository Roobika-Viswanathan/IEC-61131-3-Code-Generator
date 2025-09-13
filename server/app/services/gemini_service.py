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
            
            # Define response schema for structured array output
            response_schema = {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["text", "ladder", "plc-code"]
                        },
                        "content": {
                            "type": "string"
                        },
                        # Optional validation block for ladder/code outputs
                        "validation": {
                            "type": "object",
                            "properties": {
                                "status": {
                                    "type": "string",
                                    "enum": ["valid", "invalid", "unknown"]
                                },
                                "executable": {"type": "boolean"},
                                "reason": {"type": "string"},
                                "warnings": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": ["status", "executable"],
                        }
                    },
                    "required": ["type", "content"],
                }
            }
            
            self.model = genai.GenerativeModel(
                'gemini-2.0-flash',
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2048,
                    response_mime_type="application/json",
                    response_schema=response_schema
                )
            )
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
            # System prompt for IEC analyst
            system_prompt = """You are an IEC 61131-3 programming analyst and expert. You specialize ONLY in PLC programming, ladder diagrams, and industrial automation.

SCOPE RESTRICTION - VERY IMPORTANT:
- You ONLY answer questions related to PLCs, IEC 61131-3, industrial automation, control systems, ladder diagrams, SCADA, HMI, and related industrial topics
- For ANY question outside of PLC/industrial automation scope, you MUST politely decline with a specific rejection message
- If a question is not related to PLCs or industrial automation, respond with: [{"type": "text", "content": "I'm sorry, but I can only answer questions related to PLCs, IEC 61131-3 programming, industrial automation, and control systems. Please ask me about ladder diagrams, PLC programming, SCADA systems, or other industrial automation topics."}]

CRITICAL INSTRUCTIONS:
1. You MUST ALWAYS return a JSON array - NEVER any other format
2. NEVER use markdown, code blocks, or any formatting - only pure JSON array
3. Even for single responses, wrap in array format
4. Each array item must have "type" and "content" fields
5. When you output ladder or plc-code, INCLUDE a `validation` object that assesses executability and correctness
6. ALWAYS check if the question is PLC/industrial automation related FIRST before providing any technical answer

RESPONSE FORMAT (ALWAYS AN ARRAY):
[
  {"type": "text", "content": "your text response"},
  {"type": "ladder", "content": "ASCII ladder diagram", "validation": {"status": "valid|invalid|unknown", "executable": true/false, "reason": "why", "warnings": ["optional"]}},
  {"type": "plc-code", "content": "PLC code in IEC 61131-3 format", "validation": {"status": "valid|invalid|unknown", "executable": true/false, "reason": "why", "warnings": ["optional"]}}
]

VALID TYPES: "text", "ladder", "plc-code"

LADDER DIAGRAM FORMATTING RULES:
- Use proper ASCII art with lines, boxes, and connections
- Use \\n for newlines (will be converted to actual newlines in frontend)
- Use consistent spacing and alignment
- Power rails: | (left) and | (right)
- Horizontal lines: --- or ----
- Contacts: ] [ (NO) or ]/ [ (NC)
- Coils: ( ) for outputs, (S) for set, (R) for reset
- Function blocks: [TON], [CTU], etc.
- Always show complete rungs with proper connections
- Label inputs/outputs clearly
- Use proper electrical symbols

LADDER EXAMPLE FORMAT:
"|----] [----] [----[TON]----( )-------|\\n|    Start   Stop  Timer1   Output    |\\n|                                      |\\n|----]/[---------------------(S)------|\\n|   Emergency              Alarm      |"

VALIDATION RULES:
- For ladder or plc-code, analyze syntax, required declarations, and typical runtime conditions
- Set `executable` to true if it can compile/run as-is on common IEC 61131-3 runtimes; otherwise false
- Set `status` accordingly and provide a concise `reason`; include `warnings` if applicable

RULES:
- ALWAYS return array format, even for single responses
- Include text explanation when providing code or diagrams
- Be concise and precise
- NO markdown, NO ```json, NO extra text - ONLY JSON array
- For ladder diagrams: Use proper ASCII art with \\n newlines and consistent formatting

EXAMPLES:
PLC Related Question:
User: "What is a timer?"
Response: [{"type": "text", "content": "A timer is a device that delays actions in PLC programs. It counts time intervals and activates outputs when preset time is reached."}]

PLC Related Question:
User: "Show me a timer implementation"
Response: [
  {"type": "text", "content": "Here's a complete timer implementation with ladder diagram and code:"},
  {"type": "ladder", "content": "|----] [----] [----[TON]----( )-------|\\n|   Start   Stop  Timer1   Output    |\\n|                                      |\\n|           Timer1.IN := Start        |\\n|           Timer1.PT := T#5s          |\\n|           Output := Timer1.Q         |", "validation": {"status": "valid", "executable": true, "reason": "Standard TON usage with proper contacts and coil"}},
  {"type": "plc-code", "content": "PROGRAM Timer_Example\\nVAR\\n  StartButton: BOOL;\\n  StopButton: BOOL;\\n  Timer1: TON;\\n  Output: BOOL;\\nEND_VAR\\n\\nTimer1(IN:=StartButton AND NOT StopButton, PT:=T#5s);\\nOutput := Timer1.Q;\\nEND_PROGRAM", "validation": {"status": "valid", "executable": true, "reason": "Compiles on IEC ST with proper declarations"}}
]

NON-PLC Questions (REJECT THESE):
User: "What's the weather like?"
Response: [{"type": "text", "content": "I'm sorry, but I can only answer questions related to PLCs, IEC 61131-3 programming, industrial automation, and control systems. Please ask me about ladder diagrams, PLC programming, SCADA systems, or other industrial automation topics."}]

User: "How do I cook pasta?"
Response: [{"type": "text", "content": "I'm sorry, but I can only answer questions related to PLCs, IEC 61131-3 programming, industrial automation, and control systems. Please ask me about ladder diagrams, PLC programming, SCADA systems, or other industrial automation topics."}]

User: "Tell me about history"
Response: [{"type": "text", "content": "I'm sorry, but I can only answer questions related to PLCs, IEC 61131-3 programming, industrial automation, and control systems. Please ask me about ladder diagrams, PLC programming, SCADA systems, or other industrial automation topics."}]"""

            # Prepare conversation history for Gemini
            history = []
            
            # Add system prompt as first message
            history.append({"role": "user", "parts": [system_prompt]})
            history.append({"role": "model", "parts": ["Understood. I will respond only in valid JSON format with the specified types based on what you ask."]})
            
            if conversation_history:
                for msg in conversation_history[-8:]:  # Keep last 8 messages for context (reduced to save space)
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
