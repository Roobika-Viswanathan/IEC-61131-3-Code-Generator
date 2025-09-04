import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatService } from '@/lib/chatService';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ResponseRenderer } from '@/components/ResponseRenderer';
import { PromptGuide } from '@/components/PromptGuide';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

export function Home() {
  const { user, logout, getIdToken } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [chatService, setChatService] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const endRef = useRef(null);

  // Initialize chat service
  useEffect(() => {
    if (user && getIdToken) {
      const service = new ChatService(user, getIdToken);
      setChatService(service);
    }
  }, [user, getIdToken]);

  // Load sessions when chat service is ready
  useEffect(() => {
    if (chatService) {
      loadSessions();
    }
  }, [chatService]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const userSessions = await chatService.getSessions();
      setSessions(userSessions || []);
      
      // If no current session and we have sessions, select the first one
      if (!currentSessionId && userSessions && userSessions.length > 0) {
        await selectSession(userSessions[0].session_id);
      } else if (!userSessions || userSessions.length === 0) {
        // If no sessions exist, just clear current session
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };
  const selectSession = async (sessionId) => {
    try {
      setIsLoadingMessages(true);
      setCurrentSessionId(sessionId);
      const sessionMessages = await chatService.getSessionMessages(sessionId);
      
      // Convert to the format expected by the UI
      const formattedMessages = sessionMessages.map(msg => {
        let content = msg.content;
        
        // If content is a string, try to parse it as JSON for structured responses
        if (typeof content === 'string' && msg.role === 'assistant') {
          try {
            const parsed = JSON.parse(content);
            // If it successfully parses and looks like a structured response, use the parsed version
            if (parsed && (Array.isArray(parsed) || (parsed.responses && Array.isArray(parsed.responses)) || (parsed.type && parsed.content))) {
              content = parsed;
            }
          } catch (e) {
            // If parsing fails, keep as string
          }
        }
        
        return {
          role: msg.role,
          content: content,
          timestamp: msg.timestamp
        };
      });
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading session messages:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewChat = async () => {
    try {
      setIsLoadingSessions(true);
      const sessionId = await chatService.createSession();
      setCurrentSessionId(sessionId);
      setMessages([]);
      
      // Reload sessions to include the new one
      await loadSessions();
    } catch (error) {
      console.error('Error creating new chat:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const updateSessionTitle = async (sessionId, title) => {
    try {
      await chatService.updateSessionTitle(sessionId, title);
      // Reload sessions to reflect the change
      await loadSessions();
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await chatService.deleteSession(sessionId);
      
      // If we deleted the current session, clear it
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      
      // Reload sessions
      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const copyToClipboard = async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isSending || !currentSessionId) return;

    setIsSending(true);
    setInput('');

    // Add user message to UI immediately
    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);    try {
      // Send message to backend - it will handle adding to Firestore
      const assistantReply = await chatService.sendMessage(currentSessionId, text, messages);
      
      // Store the structured response directly - ResponseRenderer will handle parsing
      let contentToStore = assistantReply;
      
      // Add assistant reply to UI
      const assistantMessage = { role: 'assistant', content: contentToStore, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);

      // Update session title if this is the first message
      if (messages.length === 0) {
        const title = chatService.generateSessionTitle(text);
        await updateSessionTitle(currentSessionId, title);
      }
      
    } catch (error) {
      console.error('Failed to get response:', error);
      // Add error message to UI
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Chat Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={selectSession}
        onNewChat={createNewChat}
        onUpdateTitle={updateSessionTitle}
        onDeleteSession={deleteSession}
        isLoading={isLoadingSessions}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <nav className="bg-white border-b shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentSessionId ? 
                    sessions.find(s => s.session_id === currentSessionId)?.title || 'Chat' 
                    : 'Chat'
                  }
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {user?.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {user?.displayName || user?.email}
                </span>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Chat Content */}
        <main className="flex-1 flex flex-col">
          {isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading messages...</span>
            </div>
          ) : !currentSessionId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="h-8 w-8 rounded bg-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to AI Chat</h3>
                <p className="text-gray-600 mb-4">Start a new conversation to get help with anything.</p>
                <Button onClick={createNewChat}>
                  Start New Chat
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="max-w-4xl mx-auto py-8">
                    <PromptGuide />
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                      {m.role === 'user' ? (
                        // User message with copy button
                        <div className="bg-blue-600 text-white rounded-br-none rounded-2xl px-4 py-3 shadow max-w-[85%] min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-100">You</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-100 hover:text-white hover:bg-blue-700"
                              onClick={() => copyToClipboard(m.content, `user-${i}`)}
                            >
                              {copiedStates[`user-${i}`] ? (
                                <CheckIcon className="w-3 h-3" />
                              ) : (
                                <ClipboardIcon className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                          {m.timestamp && (
                            <div className="text-xs mt-1 text-blue-100">
                              {new Date(m.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Assistant message with ResponseRenderer - give it full width
                        <div className="w-full max-w-[95%] min-w-0">
                          <ResponseRenderer 
                            message={m} 
                            timestamp={m.timestamp}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              {/* Message Input */}
              <div className="border-t bg-white p-4">
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder={currentSessionId ? "Type your message..." : "Please select or create a chat session"}
                      className="min-h-12"
                      disabled={!currentSessionId || isSending}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!input.trim() || isSending || !currentSessionId}
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
