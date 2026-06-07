"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Bot, User, BookOpen, AlertCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { authManager } from "@/utils/auth"; // Accessing existing session manager

interface Message { role: 'user' | 'ai'; text: string; }

interface StudentProfile {
  id: string;
  name: string;
  firstName: string;
  username: string;
}

export default function StudyDesk({ currentSection }: { currentSection: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch current student identity safely on component mount
  useEffect(() => {
    try {
      const session = authManager.getSession();
      if (session) {
        // Extract only the first name string from the full name payload
        const extractedFirstName = session.name ? session.name.split(" ")[0] : "Student";

        setStudent({
          id: session.id,
          name: session.name,
          firstName: extractedFirstName,
          username: session.username
        });

        // Provide a warm, personalized greeting using only the first name
        setMessages([
      { 
        role: 'ai', 
        text: `Hey **${extractedFirstName}**! Ready to crack the **${currentSection}** module today? 🚀 Drop your doubts below—no question is too silly here!` 
      }
  ]);
      }
    } catch (err) {
      console.error("Failed to extract active session metrics for AI context:", err);
    }
  }, [currentSection]);

  // Auto-scroll logic
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
          student: student ? { name: student.name, firstName: student.firstName, username: student.username } : null,
          chatHistory: updatedHistory 
        }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Guruji is in deep meditation. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-[#0A0D16] border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[600px] overflow-hidden w-full max-w-lg mx-auto font-sans">
      {/* Header */}
      <div className="shrink-0 p-5 border-b border-slate-800 bg-[#0A0D16]/90 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-2xl text-amber-500"><Sparkles className="w-5 h-5" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">AI-Guruji</h4>
            <p className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wider">Academic Mentor</p>
          </div>
        </div>
        {student && (
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <User size={10} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 max-w-[80px] truncate">{student.firstName}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-amber-500" />
              </div>
            )}
            
            <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm ${
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
        {isTyping && <div className="text-xs text-slate-500 animate-pulse px-2">Guruji is writing...</div>}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="shrink-0 p-4 bg-[#0A0D16]">
        <div className="relative flex items-center bg-[#04060B] rounded-2xl border border-slate-800 focus-within:border-amber-500/50 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-transparent pl-4 pr-12 py-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <button type="submit" className="absolute right-2 p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-500"><Send className="w-4 h-4" /></button>
        </div>
      </form>
    </div>
  );
}