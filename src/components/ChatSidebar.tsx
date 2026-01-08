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
    friendshipStatus: 'none' | 'friend' | 'sent' | 'received';
}

interface FriendRequest {
    _id: string;
    user: {
        _id: string;
        name: string;
        username: string;
        image?: string;
    };
    type: 'sent' | 'received';
    createdAt: Date;
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
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchConversations();
            fetchFriendRequests();
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
        socket.on('new-message', handleNewMessage);

        // Listen for friend updates to refresh stats
        const handleFriendUpdate = () => {
            fetchConversations();
            fetchFriendRequests();
            if (searchQuery) performSearch(searchQuery);
        };
        socket.on("friend:update", handleFriendUpdate);

        return () => {
            socket.off('new-message', handleNewMessage);
            socket.off("friend:update", handleFriendUpdate);
        };
    }, [socket, searchQuery]);

    const performSearch = async (query: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/search?q=${query}`);
            if (!res.ok) {
                if (res.status === 401) {
                    console.log("User not authenticated");
                    setSearchResults([]);
                    return;
                }
                throw new Error(`Search failed: ${res.status}`);
            }
            const data = await res.json();
            setSearchResults(data);
        } catch (error) {
            console.error("Search error:", error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

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
            if (!res.ok) {
                if (res.status === 401) {
                    console.log("User not authenticated");
                    return;
                }
                throw new Error(`Failed to fetch: ${res.status}`);
            }
            const data = await res.json();
            // Filter only direct messages (1-on-1)
            const directs = data.filter((c: Conversation) => c.type === 'direct');
            setConversations(directs.sort((a: Conversation, b: Conversation) =>
                new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            ));
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    };

    const fetchFriendRequests = async () => {
        try {
            const res = await fetch('/api/friends/requests');
            if (!res.ok) return;
            const data = await res.json();
            setFriendRequests(data.received || []);
        } catch (error) {
            console.error("Error fetching friend requests:", error);
        }
    };

    const sendFriendRequest = async (userId: string) => {
        try {
            const res = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId: userId })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Failed to send friend request');
                return;
            }

            alert('Friend request sent!');
            // Refresh search results to update status
            fetchFriendRequests();
            performSearch(searchQuery);
        } catch (error) {
            console.error("Error sending friend request:", error);
            alert('Failed to send friend request');
        }
    };

    const acceptFriendRequest = async (userId: string) => {
        try {
            const res = await fetch('/api/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: userId })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Failed to accept friend request');
                return;
            }

            alert('Friend request accepted!');
            fetchFriendRequests();
            performSearch(searchQuery);
        } catch (error) {
            console.error("Error accepting friend request:", error);
            alert('Failed to accept friend request');
        }
    };

    const rejectFriendRequest = async (userId: string) => {
        try {
            const res = await fetch('/api/friends/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: userId })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Failed to reject friend request');
                return;
            }

            fetchFriendRequests();
            performSearch(searchQuery);
        } catch (error) {
            console.error("Error rejecting friend request:", error);
            alert('Failed to reject friend request');
        }
    };

    const startDirectChat = async (userId: string, friendshipStatus: string) => {
        // Check if they are friends before allowing chat
        if (friendshipStatus !== 'friend') {
            alert('You can only message friends. Send a friend request first!');
            return;
        }

        try {
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId: userId })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Failed to create chat' }));
                console.error("Error response:", errorData);
                alert(errorData.error || 'Failed to start chat. Please try again.');
                return;
            }

            const conversation = await res.json();
            setSearchQuery("");
            setShowSearch(false);
            setSearchResults([]);
            router.push(`/messages/${conversation._id}`);
            fetchConversations();
        } catch (error) {
            console.error("Error starting chat:", error);
            alert('Failed to start chat. Please check your connection and try again.');
        }
    };

    const getOtherUser = (conversation: Conversation) => {
        if (conversation.type === 'direct') {
            return session?.user?.id === conversation.memberOneId?._id 
                ? conversation.memberTwoId 
                : conversation.memberOneId;
        }
        return null;
    };    return (
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
                            onClick={() => {
                                setShowRequests(!showRequests);
                                setShowSearch(false);
                            }}
                            className="relative p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Friend Requests"
                        >
                            <Users size={20} />
                            {friendRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {friendRequests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setShowSearch(!showSearch);
                                setShowRequests(false);
                            }}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Search users"
                        >
                            {showSearch ? <X size={20} /> : <Plus size={20} />}
                        </button>
                    </div>
                </div>

                {/* Friend Requests */}
                {showRequests && friendRequests.length > 0 && (
                    <div className="mb-4 p-3 bg-muted rounded-lg animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-sm font-semibold mb-2">Friend Requests</h3>
                        <div className="space-y-2">
                            {friendRequests.map((request) => (
                                <div key={request._id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {request.user.image ? (
                                                <img src={request.user.image} alt={request.user.name} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                request.user.name[0]
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{request.user.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">@{request.user.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => acceptFriendRequest(request.user._id)}
                                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => rejectFriendRequest(request.user._id)}
                                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                            <div
                                key={user._id}
                                className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
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
                                        <p className="font-medium text-sm truncate">{user.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 ml-2 flex gap-2">
                                    {user.friendshipStatus === 'friend' ? (
                                        <button 
                                            onClick={() => startDirectChat(user._id, user.friendshipStatus)} 
                                            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90" 
                                            title="Message"
                                        >
                                            <MessageSquare size={16} />
                                        </button>
                                    ) : user.friendshipStatus === 'sent' ? (
                                        <button 
                                            disabled
                                            className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs cursor-not-allowed" 
                                            title="Request Sent"
                                        >
                                            Pending
                                        </button>
                                    ) : user.friendshipStatus === 'received' ? (
                                        <button 
                                            onClick={() => acceptFriendRequest(user._id)} 
                                            className="px-3 py-1 bg-green-600 text-white rounded-full hover:bg-green-700 text-xs" 
                                            title="Accept Friend Request"
                                        >
                                            Accept
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => sendFriendRequest(user._id)} 
                                            className="px-3 py-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 text-xs" 
                                            title="Add Friend"
                                        >
                                            Add Friend
                                        </button>
                                    )}
                                </div>
                            </div>
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
