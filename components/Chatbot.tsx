import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { createChatSession, sendMessageToChat } from '../services/geminiService';
import { ChatMessage } from '../types';
import { GenerateContentResponse, Chat } from '@google/genai';
import './Chatbot.css'; // Import the CSS for animations

interface ChatbotProps {
  isVisible: boolean;
  onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ isVisible, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat session when chatbot becomes visible
  useEffect(() => {
    if (isVisible && !chatInstance) {
      const initChat = async () => {
        try {
          const session = await createChatSession();
          setChatInstance(session);
        } catch (error) {
          console.error("Failed to initialize chat session:", error);
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: 'model', text: "Oops! I couldn't connect to my brain. Please try again later." }
          ]);
        }
      };
      initChat();
    }
  }, [isVisible, chatInstance]);

  // Scroll to bottom of messages whenever they update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      // Use the global sendMessageToChat which manages the session internally
      const streamResponse = await sendMessageToChat(userMessage.text);
      let fullResponseText = '';

      for await (const chunk of streamResponse) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponseText += c.text;
          // Update the last message in a streaming fashion
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'model' && lastMessage.id === 'streaming-response') {
              // If it's the ongoing streaming message, update it
              return prev.map((msg) =>
                msg.id === 'streaming-response' ? { ...msg, text: fullResponseText } : msg
              );
            } else {
              // Otherwise, add a new streaming message
              return [...prev, { id: 'streaming-response', role: 'model', text: fullResponseText }];
            }
          });
        }
      }

      // After streaming, replace the 'streaming-response' message with a final one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === 'streaming-response' ? { ...msg, id: Date.now().toString() } : msg
        )
      );

    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, isSending]);

  if (!isVisible) {
    return (
      <button
        onClick={onClose} // This button will actually be the open button
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full max-w-sm h-[450px] bg-slate-900/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700 flex flex-col transition-transform duration-300 ease-in-out translate-x-0 translate-y-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 rounded-t-xl">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold">WildInfo Chat</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
        {messages.length === 0 && !isSending && (
          <div className="text-center text-slate-500 italic mt-8">
            <p>Ask me anything about animals!</p>
            <p className="text-xs mt-2">Example: "Tell me a fun fact about lions."</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg shadow-md ${
                msg.role === 'user'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-700 text-slate-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg shadow-md bg-slate-700 text-slate-200 flex items-center gap-2">
              <span className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </span>
              <span className="sr-only">AI is typing</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 bg-slate-800 rounded-b-xl flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 rounded-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
          disabled={isSending}
          aria-label="Chat input"
        />
        <button
          type="submit"
          className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!inputMessage.trim() || isSending}
          aria-label="Send message"
        >
          {isSending ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <span className="typing-indicator-small">
                <span></span>
                <span></span>
                <span></span>
              </span>
              <span className="sr-only">Sending</span>
            </div>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};

export default Chatbot;