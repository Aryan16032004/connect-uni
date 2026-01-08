"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Plus, TrendingUp, Clock, Bold, Paperclip } from "lucide-react";

interface Announcement {
    _id: string;
    title: string;
    content: string;
    authorId: { _id: string; name: string };
    upvotes: string[];
    downvotes: string[];
    commentCount: number;
    createdAt: string;
}

export default function AnnouncementsPage() {
    const { data: session } = useSession();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [sort, setSort] = useState<"top" | "new">("top");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        fetchAnnouncements();
    }, [sort]);

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch(`/api/announcements?sort=${sort}`);
            if (res.ok) {
                setAnnouncements(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (announcementId: string, action: "upvote" | "downvote") => {
        try {
            const res = await fetch(`/api/announcements/${announcementId}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (res.ok) {
                fetchAnnouncements();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const applyFormatting = (format: string) => {
        const textarea = document.getElementById("announcement-content") as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        let formattedText = "";
        switch (format) {
            case "bold":
                formattedText = `**${selectedText || "bold text"}**`;
                break;
            default:
                return;
        }

        const newContent = content.substring(0, start) + formattedText + content.substring(end);
        setContent(newContent);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        try {
            const res = await fetch("/api/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content }),
            });

            if (res.ok) {
                setTitle("");
                setContent("");
                setShowCreateForm(false);
                setSelectedFile(null);
                fetchAnnouncements();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getNetVotes = (upvotes: string[], downvotes: string[]) => {
        return upvotes.length - downvotes.length;
    };

    const getUserVote = (announcement: Announcement) => {
        if (!session?.user?.id) return null;
        if (announcement.upvotes.includes(session.user.id)) return "upvote";
        if (announcement.downvotes.includes(session.user.id)) return "downvote";
        return null;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold">Campus Announcements</h1>
                            <p className="text-muted-foreground text-sm mt-1">Discuss and share with the community</p>
                        </div>
                        {session && (
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Plus size={18} />
                                Post
                            </button>
                        )}
                    </div>
                    
                    {/* Sort Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSort("top")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                sort === "top" 
                                    ? "bg-primary/20 text-primary font-semibold" 
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <TrendingUp size={16} />
                            Top
                        </button>
                        <button
                            onClick={() => setSort("new")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                sort === "new" 
                                    ? "bg-primary/20 text-primary font-semibold" 
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Clock size={16} />
                            New
                        </button>
                    </div>
                </div>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="border-b border-border bg-card/30 backdrop-blur">
                    <div className="max-w-4xl mx-auto px-4 py-6">
                        <form onSubmit={handleCreate} className="glass-card p-6 rounded-xl space-y-4 border border-border/50">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Title your post"
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                required
                            />
                            
                            {/* Formatting Toolbar */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
                                <button
                                    type="button"
                                    onClick={() => applyFormatting("bold")}
                                    className="p-2 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded transition-colors"
                                    title="Bold (select text first)"
                                >
                                    <Bold size={18} />
                                </button>
                                <div className="w-px h-6 bg-border"></div>
                                <label className="p-2 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded cursor-pointer transition-colors" title="Add attachment">
                                    <Paperclip size={18} />
                                    <input 
                                        type="file" 
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                                        className="hidden"
                                    />
                                </label>
                                {selectedFile && (
                                    <span className="text-xs text-muted-foreground ml-2">{selectedFile.name}</span>
                                )}
                            </div>

                            <textarea
                                id="announcement-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share your announcement... Use **text** for bold"
                                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[150px] resize-none"
                                required
                            />
                            
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setTitle("");
                                        setContent("");
                                        setSelectedFile(null);
                                    }}
                                    className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Post
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Announcements List */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
                {announcements.length === 0 ? (
                    <div className="glass-card rounded-lg p-12 text-center border border-border/50">
                        <MessageSquare size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No announcements yet. Be the first to post!</p>
                    </div>
                ) : (
                    announcements.map((announcement) => {
                        const userVote = getUserVote(announcement);
                        const netVotes = getNetVotes(announcement.upvotes, announcement.downvotes);

                        return (
                            <Link key={announcement._id} href={`/announcements/${announcement._id}`}>
                                <div className="glass-card rounded-lg overflow-hidden hover:bg-secondary/10 transition-all border border-border/50 hover:border-primary/30 cursor-pointer group">
                                    <div className="flex gap-3 p-4">
                                        {/* Vote Section */}
                                        <div className="flex flex-col items-center gap-1 pt-1 min-w-fit">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    session && handleVote(announcement._id, "upvote");
                                                }}
                                                disabled={!session}
                                                className={`p-1.5 rounded-lg transition-all ${
                                                    userVote === "upvote" 
                                                        ? "text-orange-500 bg-orange-500/10" 
                                                        : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/5"
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <ArrowBigUp size={20} fill={userVote === "upvote" ? "currentColor" : "none"} />
                                            </button>
                                            <span className={`text-xs font-bold px-1 ${netVotes > 0 ? "text-orange-500" : netVotes < 0 ? "text-blue-500" : "text-muted-foreground"}`}>
                                                {Math.abs(netVotes) > 999 ? `${(netVotes / 1000).toFixed(1)}k` : netVotes}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    session && handleVote(announcement._id, "downvote");
                                                }}
                                                disabled={!session}
                                                className={`p-1.5 rounded-lg transition-all ${
                                                    userVote === "downvote" 
                                                        ? "text-blue-500 bg-blue-500/10" 
                                                        : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5"
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <ArrowBigDown size={20} fill={userVote === "downvote" ? "currentColor" : "none"} />
                                            </button>
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-1 min-w-0">
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{announcement.title}</h3>
                                                <p className="text-muted-foreground text-sm line-clamp-3 whitespace-pre-wrap">{announcement.content}</p>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/30">
                                                    <span className="font-medium">by {announcement.authorId.name}</span>
                                                    <span className="opacity-50">•</span>
                                                    <span>{new Date(announcement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                    <span className="opacity-50">•</span>
                                                    <div className="flex items-center gap-1 hover:text-primary transition-colors">
                                                        <MessageSquare size={14} />
                                                        {announcement.commentCount} {announcement.commentCount === 1 ? 'comment' : 'comments'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
