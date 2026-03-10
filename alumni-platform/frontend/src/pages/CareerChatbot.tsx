import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../services/api';
import { ChatMessage } from '../types';
import { FiSend, FiRefreshCw, FiCpu } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'How to become a full-stack developer?',
  'Roadmap for Data Science career',
  'Best resources to learn React',
  'How to crack FAANG interviews?',
  'What skills do companies look for?',
  'How to build a strong portfolio?',
];

const CareerChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: "Hi! I'm your AI Career Advisor powered by Google Gemini. I can help you with career guidance, learning roadmaps, interview prep, and more. What would you like to explore today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await aiAPI.careerGuidance(userText, history);
      const aiResponse = res.data.response as string;

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: aiResponse, timestamp: new Date() }]);

      // Update conversation history for context
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userText }] },
        { role: 'model', parts: [{ text: aiResponse }] },
      ]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || 'Sorry, I encountered an error. Please try again in a moment.';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: errMsg,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{
      id: '0',
      role: 'assistant',
      text: "Hi! I'm your AI Career Advisor. What would you like to explore today?",
      timestamp: new Date(),
    }]);
    setHistory([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="icon-box w-11 h-11 bg-gradient-to-br from-primary-500 to-violet-600 text-lg animate-glow-pulse">
            <FiCpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Career Chatbot</h1>
            <p className="text-sm text-gray-500">Powered by Google Gemini · Always available, always free</p>
          </div>
        </div>
        <button onClick={handleReset} className="btn-secondary flex items-center gap-2 text-sm">
          <FiRefreshCw className="w-4 h-4" /> New Chat
        </button>
      </div>

      {/* Chat Window */}
      <div className="card p-0 overflow-hidden flex flex-col" style={{ height: '60vh' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 icon-box bg-gradient-to-br from-primary-500 to-violet-600 mr-2 flex-shrink-0 mt-0.5 shadow-sm">
                  <FiCpu className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary-600 to-violet-600 text-white rounded-br-sm shadow-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose-chat text-sm leading-relaxed">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.text}</p>
                )}
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <FiCpu className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about careers, skills, roadmaps... (Enter to send)"
              className="flex-1 input resize-none min-h-[44px] max-h-32"
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="btn-gradient p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 mb-2 font-medium">Quick questions:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="chip chip-gray text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CareerChatbot;
