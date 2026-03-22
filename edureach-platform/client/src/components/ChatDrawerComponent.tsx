import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Minus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendMessage } from "../services/chat.service";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const quickQuestions = [
  "What courses do you offer?",
  "Tell me about placements",
  "What is the fee structure?",
  "How to apply for admissions?",
];

function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm EduReach Bot. Ask me anything about courses, fees, admissions, or campus life.`,
      sender: "bot",
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Clear chat
  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm EduReach Bot. Ask me anything about courses, fees, admissions, or campus life.`,
        sender: "bot",
      },
    ]);
  };

  // ✅ Format message (bullets + headings)
  const formatMessage = (text: string) => {
    const lines = text.split("\n");

    return lines.map((line, index) => {
      if (line.trim().startsWith("-") || line.includes("*")) {
        return (
          <li key={index} className="ml-4 list-disc">
            {line.replace(/[-*]/g, "").trim()}
          </li>
        );
      }

      if (line.includes(":")) {
        return (
          <p key={index}>
            <strong>{line}</strong>
          </p>
        );
      }

      return <p key={index}>{line}</p>;
    });
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || sending) return;

    const userMsg: Message = {
      id: Date.now(),
      text: messageText,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const data = await sendMessage(messageText);

      const botMsg: Message = {
        id: Date.now() + 1,
        text: data.message,
        sender: "bot",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        id: Date.now() + 1,
        text: "Sorry, something went wrong. Please try again.",
        sender: "bot",
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      
      {/* HEADER */}
      <div className="bg-maroon px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">EduReach Bot</h3>
            <p className="text-white/70 text-xs">Ask me anything</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 🗑️ Clear Chat */}
          <button
            onClick={clearChat}
            className="text-white/70 hover:text-white p-1 text-xs"
            title="Clear chat"
          >
            🗑️
          </button>

          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <Minus className="w-4 h-4" />
          </button>

          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "bot" && (
              <div className="w-6 h-6 bg-maroon rounded-full flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
            )}

            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                msg.sender === "user"
                  ? "bg-maroon text-white"
                  : "bg-white text-gray-800 border"
              }`}
            >
              {formatMessage(msg.text)}
            </div>

            {msg.sender === "user" && (
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* Typing */}
        {sending && (
          <div className="flex items-end gap-2">
            <Bot className="w-4 h-4 text-maroon" />
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK QUESTIONS */}
      {messages.length === 1 && (
        <div className="p-2 flex flex-wrap gap-2">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-xs px-2 py-1 bg-white border rounded-full"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          className="flex-1 border px-2 py-1 rounded"
        />
        <button onClick={() => handleSend()} className="bg-maroon text-white px-3 rounded">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ChatDrawer;