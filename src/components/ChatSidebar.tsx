"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Plus, MessageSquare, Users, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { useSocket } from "@/components/providers/SocketProvider";

interface Conversation {
    _id: string;
    type: 'direct' | 'group';
    memberOneId?: any;
    memberTwoId?: any;
    members?: any[];
    name?: string;
    image?: string;
    lastMessageAt: Date;
}

interface SearchResult {
    _id: string;
    name: string;
    username: string;
    image?: string;
    bio?: string;
}

export default function ChatSidebar() {
    const { data: session } = useSession();
    const { socket, onlineUsers } = useSocket();

    useEffect(() => {
        console.log("ChatSidebar: onlineUsers update:", Array.from(onlineUsers || []));
    }, [onlineUsers]);

    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchConversations();
        }
    }, [session?.user?.id]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data: any) => {
            setConversations(prev => {
                const updated = [...prev];
                const index = updated.findIndex(c => c._id === data.conversationId);
                if (index !== -1) {
                    updated[index].lastMessageAt = new Date();
                    updated.sort((a, b) =>
                        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
                    );
                } else {
                    fetchConversations();
                }
                return updated;
            });
        };

        socket.on('new-message', handleNewMessage);
        return () => socket.off('new-message', handleNewMessage);
    }, [socket]);

    // Debounce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 2) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/chats');
            if (res.ok) {
                const data = await res.json();
                // Filter only direct messages (1-on-1)
                const directs = data.filter((c: Conversation) => c.type === 'direct');
                setConversations(directs.sort((a: Conversation, b: Conversation) =>
                    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
                ));
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    };

    const performSearch = async (query: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/search?q=${query}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const startDirectChat = async (userId: string) => {
        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId: userId })
            });

            if (res.ok) {
                const conversation = await res.json();
                setSearchQuery("");
                setShowSearch(false);
                setSearchResults([]);
                router.push(`/messages/${conversation._id}`);
                fetchConversations();
            }
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };

    const getOtherUser = (conversation: Conversation) => {
        if (conversation.type === 'direct') {
            return session?.user?.id === conversation.memberOneId?._id
                ? conversation.memberTwoId
                : conversation.memberOneId;
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare size={24} />
                        Messages
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Search users"
                        >
                            {showSearch ? <X size={20} /> : <Plus size={20} />}
                        </button>
                    </div>
                </div>

                {/* Search Box */}
                {showSearch && (
                    <div className="relative animate-in fade-in slide-in-from-top-2">
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary pr-8"
                            autoFocus
                        />
                        <Search className="absolute right-2 top-2.5 text-muted-foreground" size={16} />
                    </div>
                )}
            </div>

            {/* Search Results */}
            {showSearch && searchResults.length > 0 ? (
                <div className="flex-1 overflow-y-auto border-b border-border scrollbar-thin">
                    <div className="p-2 space-y-2">
                        {searchResults.map((user) => (
                            <button
                                key={user._id}
                                onClick={() => startDirectChat(user._id)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 relative">
                                    {user.image ? (
                                        <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        user.name[0]
                                    )}
                                    {onlineUsers?.has(user._id) && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                /* Conversations List (Only Direct) */
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                            <MessageSquare size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">No messages yet</p>
                            <button onClick={() => setShowSearch(true)} className="text-xs text-primary mt-2 hover:underline">Start a chat</button>
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {conversations.map((conversation) => {
                                const otherUser = getOtherUser(conversation);
                                // Safety check for deleted users
                                if (!otherUser || !otherUser.name) return null;

                                return (
                                    <Link
                                        key={conversation._id}
                                        href={`/messages/${conversation._id}`}
                                        className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group relative"
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold overflow-hidden">
                                                {otherUser.image ? (
                                                    <img src={otherUser.image} alt={otherUser.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    otherUser.name[0]
                                                )}
                                            </div>
                                            {onlineUsers?.has(otherUser._id) && (
                                                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {otherUser.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                @{otherUser.username}
                                            </p>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
