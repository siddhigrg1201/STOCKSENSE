import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Trash2, MessageSquare, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ai } from "../lib/gemini";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIChatbotView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your StockSense AI Assistant. I can help you analyze market trends, explain financial concepts, or even guide your real-life financial decisions. What's on your mind today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Fetch market context
      const topSymbols = ["SPY", "QQQ", "BTC-USD", "ETH-USD", "NVDA", "AAPL", "TSLA"];
      let contextString = "";
      try {
        const marketRes = await fetch(`/api/market/tickers?symbols=${topSymbols.join(",")}`);
        if (marketRes.ok) {
          const marketData = await marketRes.json();
          contextString = marketData.map((m: any) => `${m.symbol}: $${m.price.toLocaleString()} (${m.changePercent >= 0 ? '+' : ''}${m.changePercent.toFixed(2)}%)`).join(", ");
        }
      } catch (err) {
        console.warn("Failed to fetch market context for AI:", err);
      }

      const history = messages.map(m => ({
        role: m.role === "user" ? "user" : "model" as any,
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: "user", parts: [{ text: input }] }
        ],
        config: {
          systemInstruction: `You are StockSense AI, a sophisticated financial advisor and market analyst. 
          Your goal is to help users make informed decisions about stocks, crypto, and personal finance.
          
          CURRENT MARKET CONTEXT: ${contextString || "Market data currently unavailable."}
          
          When users ask for "real-life decisions", provide structured, logical advice based on financial principles.
          Always include a disclaimer that you are an AI and not a certified financial advisor.
          Keep your tone professional, encouraging, and data-driven.
          Use Markdown for formatting (bolding, lists, etc.).`,
        }
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.text || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      
      let errorMessage = "I encountered an error while processing your request. Please check your connection and try again.";
      
      // Check for quota exhaustion (429)
      const errorString = JSON.stringify(err);
      if (errorString.includes("429") || errorString.includes("RESOURCE_EXHAUSTED") || err.message?.includes("429")) {
        errorMessage = "The AI service is currently at capacity (Quota Exceeded). This usually resets shortly. Please try again in a few minutes, or try a shorter prompt.";
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How else can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-black text-text-primary tracking-tighter flex items-center gap-3">
            AI Financial Assistant <Sparkles className="text-accent" size={32} />
          </h2>
          <p className="text-text-secondary font-medium mt-1">Get real-time guidance on market trends and personal finance decisions.</p>
        </div>
        <button 
          onClick={clearChat}
          className="p-3 rounded-2xl bg-card text-text-secondary hover:text-warning hover:bg-warning/5 transition-all flex items-center gap-2"
          title="Clear Chat"
        >
          <Trash2 size={20} />
          <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Clear Chat</span>
        </button>
      </div>

      <div className="flex-1 glass rounded-[2.5rem] p-6 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent"></div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-4 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${m.role === "user" ? "accent-gradient text-white" : "bg-card-hover text-accent"}`}>
                  {m.role === "user" ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-5 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-accent/10 border border-accent/20 text-text-primary" : "bg-card border border-border text-text-secondary"}`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${m.role === "user" ? "text-accent/60 text-right" : "text-text-secondary/60"}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-10 h-10 rounded-xl bg-card-hover text-accent flex items-center justify-center shrink-0">
                  <Bot size={20} />
                </div>
                <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="mt-6 relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a stock, a financial concept, or a real-life decision..."
            className="w-full bg-card border border-border rounded-2xl py-4 pl-6 pr-16 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm text-text-primary"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl accent-gradient text-white shadow-lg shadow-accent/20 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <Send size={20} />
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2 justify-center text-[10px] text-text-secondary font-bold uppercase tracking-widest">
          <Info size={12} />
          <span>AI Assistant can make mistakes. Verify important financial info.</span>
        </div>
      </div>
    </div>
  );
}
