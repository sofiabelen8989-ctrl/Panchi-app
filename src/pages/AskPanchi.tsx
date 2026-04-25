/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Message } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleGenAI } from "@google/genai";

export function AskPanchi() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Woof! I'm Panchi AI Assistant 🐾. I'm an expert in all things dog! Ask me anything about training, health, breeds, or socialization.",
      sender: 'panchi',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY_PANCHI || process.env.GEMINI_API_KEY 
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userText,
        config: {
          systemInstruction: "You are 'Panchi AI', a friendly and enthusiastic dog expert assistant. Your tone is warm, helpful, and occasionally includes dog-related emojis (🐾, 🐕, 🦴). You are an expert in dog training, health, behavior, and breeds. If a user asks something completely unrelated to dogs, politely redirect them to a dog-related topic. Keep responses concise and practical. If you give a list, use bullet points.",
        },
      });

      const aiText = response.text || "Woof! I'm having a little trouble thinking right now. Can you ask me again?";
      
      const panchiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: 'panchi',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, panchiMessage]);
    } catch (error) {
      console.error("Gemini Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "Woof! Something went wrong in my doggy brain. Please try again in a moment! 🐾",
        sender: 'panchi',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-4 md:mt-10 px-4 h-[calc(100vh-180px)] flex flex-col">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden flex-1 flex flex-col border border-amber-100">
        <div className="bg-primary p-4 text-white flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold">Panchi AI Assistant</h2>
            <p className="text-xs text-white/80">Always happy to talk about dogs!</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 bg-amber-50/30">
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex max-w-[85%] flex-col",
                    msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm whitespace-pre-wrap",
                      msg.sender === 'user' 
                        ? "bg-secondary text-white rounded-tr-none" 
                        : "bg-white text-secondary border border-amber-100 rounded-tl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mr-auto items-start flex flex-col"
                >
                  <div className="bg-white text-secondary border border-amber-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium italic">Panchi is thinking...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t border-amber-100">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about training, food, breeds..."
              className="rounded-full border-amber-100 focus:ring-primary h-12"
            />
            <Button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary/90 flex shrink-0 shadow-lg shadow-amber-600/20 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
