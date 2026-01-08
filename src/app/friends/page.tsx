"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, UserPlus, Check, X, Clock, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";

export default function FriendsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { socket } = useSocket(); // Import socket
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [friends, setFriends] = useState<any[]>([]);
    const [requests, setRequests] = useState<{ incoming: any[], outgoing: any[] }>({ incoming: [], outgoing: [] });
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            fetchFriends();
        }
    }, [session]);

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            fetchFriends();
            if (activeTab === 'search') handleSearch();
        };

        socket.on("friend:request-received", handleUpdate);
        socket.on("friend:update", handleUpdate);

        return () => {
            socket.off("friend:request-received", handleUpdate);
            socket.off("friend:update", handleUpdate);
        }
    }, [socket, activeTab]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const timer = setTimeout(handleSearch, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const fetchFriends = async () => {
        try {
            const res = await fetch("/api/friends");
            if (res.ok) {
                const data = await res.json();
                setFriends(data.friends || []);
                setRequests(data.requests || { incoming: [], outgoing: [] });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSearch = async () => {
        try {
            const res = await fetch(`/api/users/search?q=${searchQuery}`);
            if (res.ok) setSearchResults(await res.json());
        } catch (e) { console.error(e); }
    };

    const startChat = async (userId: string) => {
        try {
            const res = await fetch("/api/chats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: userId })
            });
            if (res.ok) {
                const conv = await res.json();
                router.push(`/messages/${conv._id}`);
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to start chat');
            }
        } catch (e) { 
            console.error(e);
            alert('Failed to start chat');
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
            if (res.ok) {
                alert('Friend request sent!');
                handleSearch(); // Refresh search results
                fetchFriends(); // Refresh requests
            } else {
                alert(data.error || 'Failed to send request');
            }
        } catch (e) { 
            console.error(e);
            alert('Failed to send request');
        }
    };

    const acceptRequest = async (userId: string) => {
        try {
            const res = await fetch('/api/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: userId })
            });
            if (res.ok) {
                alert('Friend request accepted!');
                fetchFriends();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to accept request');
            }
        } catch (e) { 
            console.error(e);
            alert('Failed to accept request');
        }
    };

    const rejectRequest = async (userId: string) => {
        try {
            const res = await fetch('/api/friends/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: userId })
            });
            if (res.ok) {
                fetchFriends();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to reject request');
            }
        } catch (e) { 
            console.error(e);
            alert('Failed to reject request');
        }
    };

    const renderUserList = (users: any[], type: 'friend' | 'search' | 'incoming' | 'outgoing') => {
        if (users.length === 0) {
            return <div className="text-center text-muted-foreground p-8">No users found.</div>;
        }

        return (
            <div className="space-y-3">
                {users.map((item: any) => {
                    const user = item.user || item; // Handle nested user object in requests
                    return (
                        <div key={user._id} className="flex items-center justify-between p-4 glass-card rounded-xl border border-border/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                    {user.image ? <img src={user.image} className="w-full h-full object-cover" /> : <span className="font-bold">{user.name?.[0]}</span>}
                                </div>
                                <div>
                                    <h3 className="font-bold">{user.name}</h3>
                                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                                    {item.createdAt && <p className="text-xs text-muted-foreground mt-1">Requested {new Date(item.createdAt).toLocaleDateString()}</p>}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {type === 'friend' && (
                                    <button 
                                        onClick={() => startChat(user._id)} 
                                        className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <MessageSquare size={18} /> <span className="hidden sm:inline">Message</span>
                                    </button>
                                )}

                                {type === 'search' && (
                                    <>
                                        {user.friendshipStatus === 'friend' ? (
                                            <button 
                                                onClick={() => startChat(user._id)} 
                                                className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg flex items-center gap-2 transition-colors"
                                            >
                                                <MessageSquare size={18} /> <span className="hidden sm:inline">Message</span>
                                            </button>
                                        ) : user.friendshipStatus === 'sent' ? (
                                            <button 
                                                disabled
                                                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
                                            >
                                                <Clock size={16} className="inline mr-1" /> Pending
                                            </button>
                                        ) : user.friendshipStatus === 'received' ? (
                                            <button 
                                                onClick={() => acceptRequest(user._id)} 
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                <Check size={16} className="inline mr-1" /> Accept
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => sendFriendRequest(user._id)} 
                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                                            >
                                                <UserPlus size={16} /> Add Friend
                                            </button>
                                        )}
                                    </>
                                )}

                                {type === 'incoming' && (
                                    <>
                                        <button 
                                            onClick={() => acceptRequest(user._id)} 
                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                        >
                                            <Check size={16} /> Accept
                                        </button>
                                        <button 
                                            onClick={() => rejectRequest(user._id)} 
                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    </>
                                )}

                                {type === 'outgoing' && (
                                    <button 
                                        disabled
                                        className="px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed flex items-center gap-1"
                                    >
                                        <Clock size={16} /> Pending
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 bg-background">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Friends</h1>
                        <p className="text-muted-foreground">Manage your connections</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-secondary/30 rounded-xl w-full md:w-fit">
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'friends' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        My Friends ({friends.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Requests ({requests.incoming.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'search' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Find People
                    </button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'friends' && renderUserList(friends, 'friend')}

                    {activeTab === 'requests' && (
                        <div className="space-y-8">
                            {requests.incoming.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">Incoming <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{requests.incoming.length}</span></h3>
                                    {renderUserList(requests.incoming, 'incoming')}
                                </div>
                            )}
                            {requests.outgoing.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2 text-muted-foreground">Sent <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{requests.outgoing.length}</span></h3>
                                    {renderUserList(requests.outgoing, 'outgoing')}
                                </div>
                            )}
                            {requests.incoming.length === 0 && requests.outgoing.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground bg-secondary/5 rounded-2xl border border-border/50 border-dashed">
                                    <User size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No pending friend requests</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    className="w-full bg-secondary/50 border border-border/50 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                    placeholder="Search people by name or username..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {renderUserList(searchResults, 'search')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
