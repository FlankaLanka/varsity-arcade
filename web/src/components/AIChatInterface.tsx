import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Trash2 } from 'lucide-react';
import type { AIChatMessage, CohortProblem } from '../types/cohort';
import { useAuth } from '../context/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, onValue, remove, set, off } from 'firebase/database';
import { askAITutor } from '../services/aiTutor';
import MathRenderer from './MathRenderer';

interface AIChatInterfaceProps {
  cohortId: string;
  whiteboardSnapshot?: (() => Promise<string | null>) | null;
  members?: Array<{ userId: string; username: string; avatar?: string }>;
  currentProblem?: CohortProblem | null;
  disabled?: boolean; // Disable all chat interactions (e.g., during battle)
}

const getWelcomeMessage = (currentProblem: CohortProblem): AIChatMessage => {
  return {
    id: `welcome-${currentProblem.id}`,
    role: 'ai',
    content: `Hello! I'm your AI Tutor. Let's work on the next challenge: "${currentProblem.question}" - What do you think would be a good first step?`,
    timestamp: new Date()
  };
};

export default function AIChatInterface({ cohortId, whiteboardSnapshot, members = [], currentProblem, disabled = false }: AIChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [includeWhiteboard, setIncludeWhiteboard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatRef = ref(rtdb, `cohorts/${cohortId}/chat/messages`);
  const previousMembersRef = useRef<Map<string, string>>(new Map()); // userId -> username
  const lastProblemIdRef = useRef<string | null>(null); // Track problem to show welcome on new problem


  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessageToFirebase = async (message: AIChatMessage) => {
    try {
      const messageRef = ref(rtdb, `cohorts/${cohortId}/chat/messages/${message.id}`);
      await set(messageRef, {
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        userId: message.userId || null,
        username: message.username || null,
        imageUrl: message.imageUrl || null
      });
    } catch (error) {
      console.error('Error sending message to Firebase:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Listen to Firebase RTDB for real-time message updates
  useEffect(() => {
    if (!cohortId) return;

    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const firebaseMessages: AIChatMessage[] = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          userId: msg.userId,
          username: msg.username,
          imageUrl: msg.imageUrl || undefined
        }));

        // Sort by timestamp
        firebaseMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(firebaseMessages);
      } else {
        // No messages in Firebase - just show empty
        setMessages([]);
      }
    });

    return () => {
      off(chatRef);
    };
  }, [cohortId]);

  // Show welcome message when a new problem is loaded
  useEffect(() => {
    if (!currentProblem || !cohortId) return;
    
    // Only send welcome message if this is a new problem
    if (lastProblemIdRef.current !== currentProblem.id) {
      lastProblemIdRef.current = currentProblem.id;
      
      // Check if welcome message for this problem already exists in Firebase
      const welcomeId = `welcome-${currentProblem.id}`;
      const existingWelcome = messages.find(m => m.id === welcomeId);
      
      if (!existingWelcome) {
        const welcomeMsg = getWelcomeMessage(currentProblem);
        sendMessageToFirebase(welcomeMsg).catch(() => {});
      }
    }
  }, [currentProblem?.id, cohortId, messages]);

  const generateMessageId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const userId = user?.id || 'unknown';
    return `msg-${timestamp}-${random}-${userId}`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    const userMessage: AIChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      userId: user.id,
      username: user.username
    };

    setInputValue('');
    await sendMessageToFirebase(userMessage);
  };

  const handleAskAI = async () => {
    if (!user || isAskingAI) return;

    setIsAskingAI(true);
    setIsTyping(true);

    try {
      // First, send any message in the input field
      let pendingUserMessage: AIChatMessage | null = null;
      if (inputValue.trim()) {
        pendingUserMessage = {
          id: generateMessageId(),
          role: 'user',
          content: inputValue.trim(),
          timestamp: new Date(),
          userId: user.id,
          username: user.username
        };
        setInputValue('');
        await sendMessageToFirebase(pendingUserMessage);
        // Wait a bit for Firebase to sync and the message to appear in the messages array
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Get current messages (should include the one we just sent if any)
      // If messages array hasn't updated yet, manually include the pending message
      let messagesToSend = [...messages];
      if (pendingUserMessage && !messagesToSend.find(m => m.id === pendingUserMessage!.id)) {
        messagesToSend.push(pendingUserMessage);
      }
      
      // Ensure we have at least some context
      if (messagesToSend.length === 0 && currentProblem) {
        messagesToSend = [getWelcomeMessage(currentProblem)];
      }

      // Capture whiteboard snapshot if toggle is on
      let whiteboardImage: string | null = null;
      if (includeWhiteboard && whiteboardSnapshot && typeof whiteboardSnapshot === 'function') {
        try {
          whiteboardImage = await whiteboardSnapshot();
        } catch (error) {
          console.error('Error capturing whiteboard snapshot:', error);
        }
      }

      // Track member changes and inform AI
      const currentMemberMap = new Map(members.map(m => [m.userId, m.username]));
      const previousMemberMap = previousMembersRef.current;
      
      let memberChangeMessage: string | null = null;
      const joined = members.filter(m => !previousMemberMap.has(m.userId));
      const left = Array.from(previousMemberMap.entries())
        .filter(([id]) => !currentMemberMap.has(id))
        .map(([, username]) => username);
      
      if (joined.length > 0 || left.length > 0) {
        const joinedNames = joined.map(m => m.username).join(', ');
        const leftNames = left.join(', ');
        
        if (joined.length > 0 && left.length > 0) {
          memberChangeMessage = `${joinedNames} ${joined.length === 1 ? 'has' : 'have'} joined, and ${leftNames} ${left.length === 1 ? 'has' : 'have'} left the cohort.`;
        } else if (joined.length > 0) {
          memberChangeMessage = `${joinedNames} ${joined.length === 1 ? 'has' : 'have'} joined the cohort.`;
        } else if (left.length > 0) {
          memberChangeMessage = `${leftNames} ${left.length === 1 ? 'has' : 'have'} left the cohort.`;
        }
      }
      
      previousMembersRef.current = currentMemberMap;

      const response = await askAITutor(messagesToSend, whiteboardImage, members, memberChangeMessage, currentProblem);

      if (response.error) {
        // Show error as a user-visible message
        const errorMessage: AIChatMessage = {
          id: generateMessageId(),
          role: 'ai',
          content: `I'm sorry, I encountered an error: ${response.error}. Please try again.`,
          timestamp: new Date()
        };
        await sendMessageToFirebase(errorMessage);
      } else if (response.content) {
        const aiMessage: AIChatMessage = {
          id: generateMessageId(),
          role: 'ai',
          content: response.content,
          timestamp: new Date(),
          imageUrl: (includeWhiteboard && whiteboardImage) ? whiteboardImage : undefined // Include image if whiteboard was used
        };
        await sendMessageToFirebase(aiMessage);
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      const errorMessage: AIChatMessage = {
        id: generateMessageId(),
        role: 'ai',
        content: 'I encountered an unexpected error. Please try again.',
        timestamp: new Date()
      };
      await sendMessageToFirebase(errorMessage);
    } finally {
      setIsAskingAI(false);
      setIsTyping(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear all messages? This will delete the chat history for everyone in this cohort.')) {
      return;
    }

    try {
      await remove(chatRef);
      // Reset member tracking
      previousMembersRef.current = new Map(members.map(m => [m.userId, m.username]));
      // Only add welcome message back if there's a current problem
      if (currentProblem) {
        const welcomeMsg = getWelcomeMessage(currentProblem);
        const welcomeRef = ref(rtdb, `cohorts/${cohortId}/chat/messages/${welcomeMsg.id}`);
        await set(welcomeRef, {
          role: welcomeMsg.role,
          content: welcomeMsg.content,
          timestamp: welcomeMsg.timestamp.toISOString(),
          userId: null,
          username: null
        });
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat. Please try again.');
    }
  };

  // Initialize member tracking
  useEffect(() => {
    if (members.length > 0 && previousMembersRef.current.size === 0) {
      previousMembersRef.current = new Map(members.map(m => [m.userId, m.username]));
    }
  }, [members]);

  const isCurrentUserMessage = (msg: AIChatMessage) => {
    return msg.role === 'user' && msg.userId === user?.id;
  };

  const getUserAvatar = (msg: AIChatMessage) => {
    if (msg.role === 'ai') return null;
    if (msg.userId && msg.username) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.username)}&background=random`;
    }
    return user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random`;
  };

  const getDisplayName = (msg: AIChatMessage) => {
    if (msg.role === 'ai') return 'AI Tutor';
    if (isCurrentUserMessage(msg)) return 'You';
    return msg.username || 'Unknown User';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900 min-h-0">
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => {
          const isCurrentUser = isCurrentUserMessage(msg);
          const displayName = getDisplayName(msg);
          const avatarUrl = getUserAvatar(msg);

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                msg.role === 'ai' 
                  ? 'bg-neon-green/10 border-neon-green text-neon-green' 
                  : 'bg-neon-purple/10 border-neon-purple text-neon-purple'
              }`}>
                {msg.role === 'ai' ? (
                  <Bot size={18} />
                ) : avatarUrl ? (
                  <img 
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-neon-purple/20 flex items-center justify-center text-sm font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] rounded-lg p-3.5 text-sm border-2 ${
                msg.role === 'ai'
                  ? 'bg-gray-800 border-gray-700 text-gray-200 rounded-tl-none'
                  : 'bg-neon-purple/20 border-neon-purple/50 text-white rounded-tr-none'
              }`}>
                {!isCurrentUser && msg.role === 'user' && (
                  <p className="text-xs text-gray-400 mb-1.5 font-semibold">{displayName}</p>
                )}
                {msg.role === 'ai' && msg.imageUrl && (
                  <div className="mb-2 rounded border border-gray-600 overflow-hidden">
                    <img 
                      src={msg.imageUrl} 
                      alt="Whiteboard snapshot" 
                      className="w-full h-auto max-h-48 object-contain"
                    />
                  </div>
                )}
                <div className="leading-relaxed">
                  <MathRenderer content={msg.content} />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex gap-3">
             <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 bg-neon-green/10 border-neon-green text-neon-green">
               <Bot size={18} />
             </div>
             <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-4 rounded-tl-none flex items-center gap-2">
               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Buttons */}
      <div className={`px-3 py-2 flex items-center justify-between gap-2 border-t border-gray-800 shrink-0 ${disabled ? 'opacity-50' : ''}`}>
        <button
          onClick={handleClearChat}
          disabled={disabled}
          className="flex items-center justify-center px-2.5 py-1.5 text-xs font-medium bg-red-900/20 border border-red-500/50 text-red-400 rounded hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={disabled ? "Chat disabled during battle" : "Clear all messages and AI memory"}
        >
          <Trash2 size={14} />
        </button>
        {/* Whiteboard Toggle and Ask AI */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">WHITEBOARD</span>
          <button
            onClick={() => setIncludeWhiteboard(!includeWhiteboard)}
            disabled={disabled || !whiteboardSnapshot}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${
              includeWhiteboard ? 'bg-neon-cyan' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={includeWhiteboard}
            aria-label="Include whiteboard content in AI requests"
            title={disabled ? "Chat disabled during battle" : (whiteboardSnapshot ? "Include whiteboard content in AI requests" : "Whiteboard not available")}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                includeWhiteboard ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
          <button
            onClick={handleAskAI}
            disabled={disabled || isAskingAI || messages.length === 0}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-neon-green/10 border border-neon-green/50 text-neon-green rounded hover:bg-neon-green/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={disabled ? "Chat disabled during battle" : "Ask AI Tutor for help with the conversation"}
          >
            <Sparkles size={14} />
            ASK AI
          </button>
        </div>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className={`p-4 bg-gray-900 border-t border-gray-800 shrink-0 ${disabled ? 'opacity-50' : ''}`}>
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={disabled ? "Chat disabled during battle..." : "Type a message..."}
            disabled={disabled}
            className="w-full bg-black/50 border-2 border-gray-700 rounded-lg py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_10px_rgba(41,255,100,0.2)] transition-all disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neon-green disabled:opacity-50 disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
