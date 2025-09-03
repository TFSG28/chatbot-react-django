"use client";

import { useState, useEffect, useRef } from "react";
import SideBar from "./components/SideBar";
import { FaRegStopCircle } from "react-icons/fa";
import { LuSend } from "react-icons/lu";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  error?: Error;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string>();
  const [chatTitle, setChatTitle] = useState<string>("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 240; // Maximum height (approximately 5 lines)
      const minHeight = 48; // Minimum height (1 line)
      
      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(undefined);
    setChatTitle("");
  };

  const handleSelectChat = async (chatId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${chatId}/`);
      if (response.ok) {
        const data = await response.json();
        const loadedMessages = data.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(loadedMessages);
        setCurrentChatId(chatId);
        setChatTitle(data.session_title);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const formatMessageContent = (content: string) => {
    // Split content by code blocks (```language or ```)
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code
        const lines = part.slice(3, -3).split('\n');
        const language = lines[0].trim();
        const code = lines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-t-lg px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
              {language || 'code'}
            </div>
            <div className="bg-black rounded-b-lg p-4 overflow-auto">
              <pre className="text-sm">
                <code className="text-green-400">{code}</code>
              </pre>
            </div>
          </div>
        );
      } else {
        // Regular text with line breaks preserved
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      }
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/predict/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: userMessage.content,
          session_id: currentChatId
        }),
        signal: controller.signal
      });

      if (controller.signal.aborted) {
        return;
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.prediction || "No response",
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update current chat ID and title if this is a new chat
      if (!currentChatId && data.session_id) {
        setCurrentChatId(data.session_id);
        setChatTitle(data.chat_title);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error message
        return;
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "Error: Could not reach server",
        role: 'assistant',
        timestamp: new Date(),
        error: error as Error
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleButtonClick = () => {
    if (isLoading) {
      handleStopMessage();
    } else {
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <SideBar
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        currentChatId={currentChatId}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {chatTitle || "ChatBot"}
          </h1>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start a conversation by typing a message below.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <div>
                      {message.role === 'assistant' ? formatMessageContent(message.content) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Message ChatBot..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  rows={1}
                  style={{ minHeight: '48px' }}
                  disabled={isLoading}
                />
                <button
                  onClick={handleButtonClick}
                  disabled={!isLoading && !inputValue.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <FaRegStopCircle size={20} />
                  ) : (
                    <LuSend size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}