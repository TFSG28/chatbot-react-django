"use client";

import { useState, useEffect } from "react";

interface ChatHistoryItem {
    id: string;
    title: string;
    timestamp: Date;
    lastMessage: string;
}

interface SideBarProps {
    onNewChat: () => void;
    onSelectChat: (chatId: string) => void;
    currentChatId?: string;
}

export default function SideBar({ onNewChat, onSelectChat, currentChatId }: SideBarProps) {
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadChatHistory = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/`);
                if (response.ok) {
                    const data = await response.json();
                    const parsedChats = data.sessions.map((chat: ChatHistoryItem) => ({
                        ...chat,
                        timestamp: new Date(chat.timestamp)
                    }));
                    setChatHistory(parsedChats);
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadChatHistory();
    }, [currentChatId]);

    const handleNewChat = () => {
        onNewChat();
    };

    const handleSelectChat = (chatId: string) => {
        onSelectChat(chatId);
    };

    const deleteChat = async (chatId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${chatId}/delete/`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };

    const formatTimestamp = (timestamp: Date) => {
        const now = new Date();
        const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else {
            return timestamp.toLocaleDateString();
        }
    };

    const truncateText = (text: string, maxLength: number = 30) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className={`bg-gray-900 text-white h-full flex flex-col transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-64'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                {!isCollapsed && (
                    <h2 className="text-lg font-semibold">Chat History</h2>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 hover:bg-gray-700 rounded"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                        />
                    </svg>
                </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
                <button
                    onClick={handleNewChat}
                    className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${isCollapsed ? 'px-2' : ''
                        }`}
                    aria-label="Start new chat"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {!isCollapsed && <span>New Chat</span>}
                </button>
            </div>

            {/* Chat History List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    !isCollapsed && (
                        <div className="p-4 text-gray-400 text-sm text-center">
                            Loading chats...
                        </div>
                    )
                ) : chatHistory.length === 0 ? (
                    !isCollapsed && (
                        <div className="p-4 text-gray-400 text-sm text-center">
                            No chat history yet
                        </div>
                    )
                ) : (
                    <div className="space-y-1 p-2">
                        {chatHistory.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 group relative ${currentChatId === chat.id
                                    ? 'bg-gray-700'
                                    : 'hover:bg-gray-800'
                                    } ${isCollapsed ? 'px-2' : ''}`}
                                title={isCollapsed ? chat.title : undefined}
                            >
                                {!isCollapsed ? (
                                    <>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium truncate">
                                                    {truncateText(chat.title)}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatTimestamp(chat.timestamp)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => deleteChat(chat.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity duration-200 ml-2"
                                                aria-label="Delete chat"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-center">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {!isCollapsed && (
                <div className="p-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400 text-center">
                        {chatHistory.length} chat{chatHistory.length !== 1 ? 's' : ''}
                    </div>
                </div>
            )}
        </div>
    );
}