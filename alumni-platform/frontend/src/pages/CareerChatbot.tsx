import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../services/api';
import { ChatMessage } from '../types';
import { FiSend, FiRefreshCw } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { MdPsychology } from 'react-icons/md';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const markdownComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-3 mb-2 text-sm sm:text-base font-extrabold text-violet-800 border-l-4 border-violet-300 pl-2.5">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-2.5 mb-1.5 text-xs sm:text-sm font-bold text-indigo-800">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-2">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 mb-2 pl-4 list-disc marker:text-violet-500">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1.5 mb-2 pl-4 list-decimal marker:text-indigo-600">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-xs sm:text-sm text-slate-700 leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold text-slate-900">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
      {children}
    </a>
  ),
};

const QUICK_PROMPTS = [
  { icon: '🚀', text: 'How to become a full-stack developer?' },
  { icon: '📊', text: 'Roadmap for Data Science career' },
  { icon: '⚛️', text: 'Best resources to learn React' },
  { icon: '🏢', text: 'How to crack FAANG interviews?' },
  { icon: '💼', text: 'What skills do companies look for?' },
  { icon: '🎯', text: 'How to build a strong portfolio?' },
];

const CareerChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: "Hi! I'm your AI Career Advisor. I can help with careers, roadmaps, and interview prep. What would you like to explore today?",
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
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userText }] },
        { role: 'model', parts: [{ text: aiResponse }] },
      ]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || 'Sorry, I encountered an error. Please try again in a moment.';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: errMsg, timestamp: new Date() }]);
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
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-300/50">
              <MdPsychology className="w-7 h-7 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 opacity-30 blur-md scale-110 -z-10" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white">
              <div className="w-full h-full rounded-full bg-green-400 animate-ping opacity-75" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">
                AI Career Chatbot
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-600 rounded-full text-xs font-semibold border border-violet-100">
                <HiSparkles className="w-3 h-3" /> Groq AI
              </span>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Always available, always free
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-violet-200 hover:text-violet-600 transition-all duration-200 shadow-sm group"
        >
          <FiRefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          New Chat
        </button>
      </div>

      {/* CHAT WINDOW */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden flex flex-col shadow-xl shadow-gray-100/60" style={{ height: '60vh' }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ background: 'linear-gradient(160deg, #f5f3ff 0%, #eef2ff 50%, #f5f3ff 100%)' }}>
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
                  <MdPsychology className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-xs font-bold">U</span>
                </div>
              )}
              <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-violet-200/60'
                    : 'bg-white/95 text-gray-800 rounded-bl-sm shadow-md border border-violet-100/70 ai-answer-surface'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="max-w-none ai-answer-enter">
                      <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
                <MdPsychology className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-sm border border-gray-100/80">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask careers, skills, roadmap..."
              rows={1}
              className="flex-1 px-3 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition-all resize-none min-h-[42px] max-h-32 placeholder-gray-400"
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none flex-shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QUICK PROMPTS */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <HiSparkles className="w-4 h-4 text-violet-500" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quick Questions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={p.text}
              onClick={() => handleSend(p.text)}
              disabled={loading}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50 hover:border-violet-200 hover:text-violet-700 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 animate-fade-in"
            >
              <span>{p.icon}</span>
              {p.text}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes aiAnswerRise {
          from { opacity: 0; transform: translateY(8px) scale(0.995); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ai-answer-enter {
          animation: aiAnswerRise 280ms ease-out;
        }
        .ai-answer-surface {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,255,0.98) 100%);
        }
      `}</style>
    </div>
  );
};

export default CareerChatbot;
