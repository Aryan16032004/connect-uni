"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Compass, MessageSquare, Plus, Search, Users, Hash, Shield } from "lucide-react";
import { ServerDiscoveryList } from "@/components/server/ServerDiscovery";
import { useRouter } from "next/navigation";

export default function CommunityPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [conversations, setConversations] = useState<any[]>([]);
    const [myServers, setMyServers] = useState<any[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (session) {
            fetchConversations();
            fetchMyServers();
        }
    }, [session]);

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) setConversations(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMyServers = async () => {
        try {
            const res = await fetch("/api/servers");
            if (res.ok) setMyServers(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleCreateServer = async () => {
        const name = prompt("Enter Server Name:");
        if (!name) return;

        const isPrivate = confirm("Make this server Private?\n(Private servers are NOT listed in the Discovery page).");

        try {
            const res = await fetch("/api/servers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description: "A new community",
                    icon: "",
                    visibility: isPrivate ? "private" : "public"
                })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/community/${data.server._id}`);
            }
        } catch (error) {
            alert("Failed to create server");
        }
    };

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const timer = setTimeout(handleSearch, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleSearch = async () => {
        setSearching(true);
        try {
            const res = await fetch(`/api/users/search?q=${searchQuery}`);
            if (res.ok) setSearchResults(await res.json());
        } catch (e) { console.error(e); }
        finally { setSearching(false); }
    };

    const startConversation = async (userId: string) => {
        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remoteUserId: userId })
            });
            if (res.ok) {
                const conv = await res.json();
                router.push(`/community/me/${conv._id}`);
            } else {
                alert("Failed to start conversation");
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 bg-background relative scroll-smooth">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            Welcome back, {session?.user?.name?.split(' ')[0] || "User"}
                        </h1>
                        <p className="text-muted-foreground mt-1">Here's what's happening in your communities.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowSearch(true)}
                            className="bg-card hover:bg-muted text-foreground px-4 py-2 rounded-xl border border-border/50 shadow-sm transition-all flex items-center gap-2"
                        >
                            <MessageSquare size={18} className="text-purple-400" /> New Message
                        </button>
                        <button
                            onClick={handleCreateServer}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> Create Server
                        </button>
                    </div>
                </div>

                {/* My Servers Section */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Shield className="text-indigo-400" size={20} /> Your Servers
                    </div>

                    {myServers.length === 0 ? (
                        <div className="p-8 rounded-2xl glass-card border border-border/50 text-center text-muted-foreground">
                            You haven't joined any servers yet. Explore below!
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {myServers.map(server => (
                                <Link
                                    href={`/community/${server._id}`}
                                    key={server._id}
                                    className="group glass-card p-4 rounded-2xl border border-border/50 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 flex flex-col gap-3"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                                        {server.icon ? <img src={server.icon} className="w-full h-full rounded-xl object-cover" /> : server.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold truncate">{server.name}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{server.description || "No description"}</p>
                                    </div>
                                    <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Active now
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* Recent Messages Section */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Users className="text-pink-400" size={20} /> Recent Messages
                    </div>

                    {conversations.length === 0 ? (
                        <div className="p-8 rounded-2xl glass-card border border-border/50 text-center text-muted-foreground">
                            No recent conversations. Start a chat!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {conversations.map(conv => {
                                // Safe navigation to prevent crash if a user is deleted
                                const m1 = conv.memberOneId?._id;
                                const m2 = conv.memberTwoId?._id;
                                if (!m1 || !m2) return null; // Skip corrupted conversations

                                const other = m1 === session?.user?.id ? conv.memberTwoId : conv.memberOneId;
                                if (!other) return null;

                                return (
                                    <Link
                                        href={`/messages/${conv._id}`}
                                        key={conv._id}
                                        className="glass-card p-4 rounded-2xl border border-border/50 hover:border-pink-500/50 hover:bg-secondary/10 transition-all flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 p-[2px]">
                                            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                                                {other?.image ? <img src={other.image} className="w-full h-full object-cover" /> : <span className="font-bold text-sm">{other?.name?.[0]}</span>}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold truncate">{other?.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">Click to resume chat</p>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Discovery Section */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Compass className="text-purple-400" size={20} /> Explore Communities
                    </div>
                    <ServerDiscoveryList />
                </section>

            </div>

            {/* User Search / New Message Modal */}
            {showSearch && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-in fade-in duration-200">
                    <div className="bg-background border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[600px] overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                            <h3 className="font-bold">New Message</h3>
                            <button onClick={() => setShowSearch(false)} className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">✕</button>
                        </div>
                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    className="w-full bg-secondary/50 border border-border/50 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                    placeholder="Search people by name..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {searching && <div className="text-sm text-center text-muted-foreground p-8">Searching...</div>}
                            {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                                <div className="text-sm text-center text-muted-foreground p-8">No users found.</div>
                            )}
                            {searchResults.map(user => (
                                <button
                                    key={user._id}
                                    onClick={() => startConversation(user._id)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/20 rounded-xl text-left transition-all"
                                >
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                        {user.image ? <img src={user.image} className="w-full h-full object-cover" /> : <span className="font-bold">{user.name[0]}</span>}
                                    </div>
                                    <div>
                                        <div className="font-bold">{user.name}</div>
                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
