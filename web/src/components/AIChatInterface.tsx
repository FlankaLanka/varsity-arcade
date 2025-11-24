import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import type { AIChatMessage } from '../types/cohort';
import { useAuth } from '../context/AuthContext';

const MOCK_RESPONSES = [
  { keyword: 'math', response: "That looks like an interesting math problem! Have you tried isolating the variable?" },
  { keyword: 'help', response: "I'm here to help! Try breaking the problem into smaller steps." },
  { keyword: 'stuck', response: "Don't worry, getting stuck is part of learning. What do you know so far?" },
  { keyword: 'hello', response: "Hello! Ready to solve some problems together?" },
  { keyword: 'hi', response: "Hi there! Let's get to work." },
];

const DEFAULT_RESPONSE = "I see. Keep going, you're doing great! Let me know if you need specific guidance.";

export default function AIChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: "Hello! I'm your AI Tutor. I can help monitor your progress and provide hints. Start by drawing on the whiteboard!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Mock AI response delay
    setTimeout(() => {
      const lowerInput = userMessage.content.toLowerCase();
      const matched = MOCK_RESPONSES.find(m => lowerInput.includes(m.keyword));
      const responseContent = matched ? matched.response : DEFAULT_RESPONSE;

      const aiMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: responseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
              msg.role === 'ai' 
                ? 'bg-neon-green/10 border-neon-green text-neon-green' 
                : 'bg-neon-purple/10 border-neon-purple text-neon-purple'
            }`}>
              {msg.role === 'ai' ? (
                <Bot size={16} />
              ) : (
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random`}
                  alt="Me" 
                  className="w-full h-full rounded-full object-cover"
                />
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-lg p-3 text-sm border ${
              msg.role === 'ai'
                ? 'bg-gray-800 border-gray-700 text-gray-200 rounded-tl-none'
                : 'bg-neon-purple/20 border-neon-purple/50 text-white rounded-tr-none'
            }`}>
              <p>{msg.content}</p>
              <p className="text-[10px] text-gray-500 mt-1 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-neon-green/10 border-neon-green text-neon-green">
               <Bot size={16} />
             </div>
             <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 rounded-tl-none flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
               <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
               <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 bg-gray-900 border-t border-gray-800">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask AI Tutor..."
            className="w-full bg-black/50 border border-gray-700 rounded-lg py-2 pl-4 pr-10 text-white focus:outline-none focus:border-neon-green focus:shadow-[0_0_10px_rgba(41,255,100,0.2)]"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neon-green disabled:opacity-50 disabled:hover:text-gray-400 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
