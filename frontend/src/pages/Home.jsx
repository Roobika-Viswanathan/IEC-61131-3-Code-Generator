import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export function Home() {
  const { user, logout, getIdToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef(null);

  // Load and persist messages per user
  useEffect(() => {
    const key = `chat:${user?.uid || 'anon'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (_) {
        setMessages(defaultWelcome(user));
      }
    } else {
      setMessages(defaultWelcome(user));
    }
  }, [user?.uid]);

  useEffect(() => {
    const key = `chat:${user?.uid || 'anon'}`;
    if (messages.length) {
      localStorage.setItem(key, JSON.stringify(messages));
    }
  }, [messages, user?.uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const defaultWelcome = (u) => [
    {
      role: 'assistant',
      content: `Hi${u?.displayName ? `, ${u.displayName}` : ''}! I'm your AI assistant powered by Gemini 2.0 Flash. Ask me anything to get started.`,
    },
  ];

  const sendMessageToBackend = async (message, conversationHistory) => {
    try {
      return await api.chat(message, conversationHistory, getIdToken);
    } catch (error) {
      console.error('Error sending message to backend:', error);
      throw error;
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
    if (!text || isSending) return;

    setIsSending(true);
    setInput('');

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Send message to backend with conversation history
      const assistantReply = await sendMessageToBackend(text, messages);
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantReply }
      ]);
    } catch (error) {
      console.error('Failed to get response:', error);
      // Fallback error message
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error while processing your message. Please try again.' 
        }
      ]);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
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

      {/* Chat Area */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto h-full flex flex-col px-4 py-6">
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={
                    `max-w-[85%] rounded-2xl px-4 py-3 shadow ` +
                    (m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-900 border rounded-bl-none')
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <form onSubmit={sendMessage} className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type your message..."
                className="min-h-12"
              />
            </div>
            <Button type="submit" disabled={!input.trim() || isSending}>
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
