// src/app/student/components/StudyDesk.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useStudentSession, StudentSession } from "@/utils/auth";

interface Message { 
  role: 'user' | 'ai'; 
  text: string; 
}

interface ExtendedStudentProfile extends StudentSession {
  firstName: string;
}

interface StudyDeskProps {
  currentSection: string;
  /** Fill the parent's height/width with no outer card styling (used inside Focus Canvas) */
  fullHeight?: boolean;
  /** When provided, a close button is shown in the header */
  onClose?: () => void;
}

export default function StudyDesk({ currentSection, fullHeight = false, onClose }: StudyDeskProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [student, setStudent] = useState<ExtendedStudentProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { session } = useStudentSession();

  useEffect(() => {
    try {
      if (session) {
        const extractedFirstName = session.name ? session.name.split(" ")[0] : "Student";

        setStudent({
          ...session,
          firstName: extractedFirstName
        });

        // Dynamic gender-aware initial interface message
        const isFemale = session.gender?.toLowerCase() === 'female' || session.gender?.toLowerCase() === 'girl';
        const personalGreeting = isFemale ? `${extractedFirstName}, dear` : extractedFirstName;

        setMessages([
          { 
            role: 'ai', 
            text: `Hello **${personalGreeting}**! Ready to clear your doubts in the **${currentSection}** module today? 🚀 Drop your questions below—I am here to guide you step-by-step.` 
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to extract active session metrics for AI context:", err);
    }
  }, [currentSection, session]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    const updatedHistory: Message[] = [...messages, { role: 'user', text: userMessage }];
    
    setMessages(updatedHistory);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          currentSection,
          student: student ? { 
            id: student.id,
            name: student.name, 
            firstName: student.firstName, 
            username: student.username,
            gender: student.gender,
            state: student.state,
            district: student.district,
            current_plan: student.current_plan
          } : null,
          chatHistory: updatedHistory // Pass historical payload securely for contextual memory
        }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Guruji is processing your solution. Please try again in a moment." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      className={`bg-[#0A0D16] border-slate-800 shadow-2xl flex flex-col overflow-hidden w-full font-sans ${
        fullHeight
          ? "h-full rounded-none border-0 shadow-none"
          : "h-[600px] max-w-lg mx-auto rounded-3xl border"
      }`}
    >
      {/* Header */}
      <div className="shrink-0 p-4 md:p-5 border-b border-slate-800 bg-[#0A0D16]/90 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0"><Sparkles className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-100">AI-Guruji</h4>
            <p className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wider truncate">Academic Mentor</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {student && (
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center gap-1.5">
              <User size={10} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 max-w-[80px] truncate">{student.firstName}</span>
            </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close AI-Guruji"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Window */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-6 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-amber-500" />
              </div>
            )}
            
            <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] min-w-0 break-words shadow-sm ${
              m.role === 'user' 
                ? 'bg-amber-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeKatex]}
                components={{
                  strong: ({node, ...props}) => <strong className="text-amber-400 font-bold" {...props} />,
                  code: ({node, ...props}) => <code className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono text-amber-200" {...props} />
                }}
              >
                {m.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-slate-500 animate-pulse px-2">Guruji is calculating...</div>}
      </div>

      {/* User Input Module Area */}
      <form onSubmit={handleSendMessage} className="shrink-0 p-4 bg-[#0A0D16] border-t border-slate-800/60">
        <div className="relative flex items-center bg-[#04060B] rounded-2xl border border-slate-800 focus-within:border-amber-500/50 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-transparent pl-4 pr-12 py-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <button type="submit" className="absolute right-2 p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-500">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}