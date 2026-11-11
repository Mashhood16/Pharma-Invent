"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Send,
  RotateCcw,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  toolUsed?: string;
  timestamp: string;
}

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: "ADMIN" | "CASHIER";
}

export function AIAssistantModal({
  isOpen,
  onClose,
  userRole = "ADMIN",
}: AIAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Pharma AI Assistant active. You can query your live inventory, today's sales, or upcoming batch expiries in natural language.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    { label: "Profit Today", query: "What is my profit today?" },
    { label: "Expiring Batches", query: "Which medicines are expiring next month?" },
    { label: "Weekly Inflow", query: "Show weekly supplier inflow and spend" },
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.reply,
          toolUsed: data.toolUsed,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.error || "Could not retrieve database response.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Connection error to local AI service.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col text-zinc-100 font-sans">
      {/* Header */}
      <div className="h-12 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Bot className="w-4 h-4 text-zinc-400" />
          <span className="font-semibold text-xs text-zinc-200">AI Inventory Assistant</span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Queries */}
      <div className="px-3 py-2 bg-zinc-900/40 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
        {quickPrompts.map((p) => (
          <button
            key={p.label}
            onClick={() => handleSend(p.query)}
            disabled={isLoading}
            className="text-[11px] whitespace-nowrap bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[90%] rounded p-2.5 leading-relaxed whitespace-pre-line ${
                m.sender === "user"
                  ? "bg-zinc-800 text-zinc-100"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300"
              }`}
            >
              {m.text}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 px-1">
              {m.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="text-zinc-500 text-[11px] p-2 bg-zinc-900 rounded border border-zinc-850 w-fit">
            Querying database...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about inventory, profit, or expiry..."
            disabled={isLoading}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-zinc-100 hover:bg-white disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-600 px-3 py-1.5 rounded font-medium text-xs transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
