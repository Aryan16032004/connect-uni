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
    const { socket } = useSocket();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
    const [groupName, setGroupName] = useState("");
    const [groupMembers, setGroupMembers] = useState<string[]>([]);

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
                }
                return updated;
            });
        };

        socket.on('new-message', handleNewMessage);
        return () => socket.off('new-message', handleNewMessage);
    }, [socket]);

    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/chats');
            if (res.ok) {
                const data = await res.json();
                setConversations(data.sort((a: Conversation, b: Conversation) =>
                    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
                ));
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

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
            }
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };

    const createGroup = async () => {
        if (!groupName.trim() || groupMembers.length === 0) {
            alert("Group name and members are required");
            return;
        }

        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: groupName,
                    memberIds: groupMembers
                })
            });

            if (res.ok) {
                const group = await res.json();
                setGroupName("");
                setGroupMembers([]);
                setShowCreateGroup(false);
                fetchConversations();
                router.push(`/messages/${group._id}`);
            }
        } catch (error) {
            console.error("Error creating group:", error);
        }
    };

    const toggleGroupMember = (userId: string) => {
        setGroupMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const getOtherUser = (conversation: Conversation) => {
        if (conversation.type === 'direct') {
            return session?.user?.id === conversation.memberOneId?._id 
                ? conversation.memberTwoId 
                : conversation.memberOneId;
        }
        return null;
    };

    const directChats = conversations.filter(c => c.type === 'direct');
    const groupChats = conversations.filter(c => c.type === 'group');

    const displayConversations = activeTab === 'chats' ? directChats : groupChats;

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
                            <Search size={20} />
                        </button>
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Create group"
                        >
                            <Users size={20} />
                        </button>
                    </div>
                </div>

                {/* Search Box */}
                {showSearch && (
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSearchResults([]);
                                }}
                                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Search Results */}
            {showSearch && searchResults.length > 0 && (
                <div className="flex-1 overflow-y-auto border-b border-border">
                    <div className="p-2 space-y-2">
                        {searchResults.map((user) => (
                            <button
                                key={user._id}
                                onClick={() => startDirectChat(user._id)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                    {user.image ? (
                                        <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        user.name[0]
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 p-4 border-b border-border">
                <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'chats'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                    }`}
                >
                    Direct
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'groups'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                    }`}
                >
                    Groups
                </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {displayConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                        <MessageSquare size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">
                            {activeTab === 'chats' 
                                ? 'No direct messages yet'
                                : 'No groups yet'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {displayConversations.map((conversation) => {
                            const otherUser = getOtherUser(conversation);
                            return (
                                <Link
                                    key={conversation._id}
                                    href={`/messages/${conversation._id}`}
                                    className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                        {conversation.image ? (
                                            <img src={conversation.image} alt={conversation.name} className="w-full h-full rounded-full object-cover" />
                                        ) : otherUser?.image ? (
                                            <img src={otherUser.image} alt={otherUser.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            (conversation.name || otherUser?.name)[0]
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {conversation.name || otherUser?.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {otherUser?.username ? `@${otherUser.username}` : `${conversation.members?.length || 0} members`}
                                        </p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background">
                            <h3 className="font-bold text-lg">Create Group</h3>
                            <button
                                onClick={() => setShowCreateGroup(false)}
                                className="p-1 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Group Name */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Enter group name"
                                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>

                            {/* Search Members */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Add Members</label>
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>

                            {/* Members List */}
                            {searchResults.length > 0 && (
                                <div className="border border-border rounded-lg divide-y max-h-48 overflow-y-auto">
                                    {searchResults.map((user) => (
                                        <label
                                            key={user._id}
                                            className="flex items-center gap-3 p-3 hover:bg-muted transition-colors cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={groupMembers.includes(user._id)}
                                                onChange={() => toggleGroupMember(user._id)}
                                                className="w-4 h-4"
                                            />
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {user.image ? (
                                                    <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    user.name[0]
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{user.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Selected Members */}
                            {groupMembers.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">{groupMembers.length} member(s) selected</p>
                                    <div className="flex flex-wrap gap-2">
                                        {searchResults
                                            .filter(u => groupMembers.includes(u._id))
                                            .map(user => (
                                                <div
                                                    key={user._id}
                                                    className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                                >
                                                    {user.name}
                                                    <button
                                                        onClick={() => toggleGroupMember(user._id)}
                                                        className="hover:text-primary/70"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-border">
                                <button
                                    onClick={() => setShowCreateGroup(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createGroup}
                                    disabled={!groupName.trim() || groupMembers.length === 0}
                                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Group
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
