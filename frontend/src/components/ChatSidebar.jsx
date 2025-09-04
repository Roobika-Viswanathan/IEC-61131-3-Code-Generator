import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  PlusIcon, 
  ChatBubbleLeftIcon, 
  PencilIcon, 
  TrashIcon,
  CheckIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

export function ChatSidebar({ 
  sessions, 
  currentSessionId, 
  onSessionSelect, 
  onNewChat, 
  onUpdateTitle, 
  onDeleteSession,
  isLoading 
}) {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (session) => {
    setEditingSessionId(session.session_id);
    setEditTitle(session.title);
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  const saveTitle = async (sessionId) => {
    if (editTitle.trim()) {
      await onUpdateTitle(sessionId, editTitle.trim());
    }
    cancelEditing();
  };

  const handleKeyPress = (e, sessionId) => {
    if (e.key === 'Enter') {
      saveTitle(sessionId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-80 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">        <Button 
          onClick={onNewChat}
          className="w-full flex items-center gap-2 text-base"
          disabled={isLoading}
        >
          <PlusIcon className="w-5 h-5" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-pulse">Loading chats...</div>
          </div>        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-base">No chats yet</p>
            <p className="text-sm">Start a new conversation!</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <Card 
                key={session.session_id}
                className={`p-3 cursor-pointer transition-all hover:bg-gray-100 ${
                  currentSessionId === session.session_id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'border-transparent'
                }`}
                onClick={() => onSessionSelect(session.session_id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingSessionId === session.session_id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, session.session_id)}
                          className="h-6 text-base"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveTitle(session.session_id);
                          }}
                        >
                          <CheckIcon className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (                      <div>
                        <h3 className="font-medium text-base truncate">
                          {session.title}
                        </h3>
                        {session.last_message && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {session.last_message}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-400">
                            {session.message_count} messages
                          </span>
                          <span className="text-sm text-gray-400">
                            {formatDate(session.updated_at)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {editingSessionId !== session.session_id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(session);
                        }}
                      >
                        <PencilIcon className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this chat?')) {
                            onDeleteSession(session.session_id);
                          }
                        }}
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
