"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { ArrowBigUp, ArrowBigDown, MessageSquare, ArrowLeft, Trash2 } from "lucide-react";

interface Comment {
    _id: string;
    content: string;
    authorId: { _id: string; name: string };
    upvotes: string[];
    downvotes: string[];
    createdAt: string;
    replies?: Comment[];
}

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

export default function AnnouncementDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { data: session } = useSession();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchAnnouncement();
            fetchComments();
        }
    }, [id]);

    const fetchAnnouncement = async () => {
        try {
            const res = await fetch(`/api/announcements/${id}`);
            if (res.ok) {
                setAnnouncement(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/announcements/${id}/comments`);
            if (res.ok) {
                setComments(await res.json());
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleVote = async (action: "upvote" | "downvote") => {
        try {
            const res = await fetch(`/api/announcements/${id}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (res.ok) {
                fetchAnnouncement();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCommentVote = async (commentId: string, action: "upvote" | "downvote") => {
        try {
            const res = await fetch(`/api/announcements/${id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentId, action }),
            });

            if (res.ok) {
                fetchComments();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const res = await fetch(`/api/announcements/${id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newComment,
                    parentCommentId: replyTo,
                }),
            });

            if (res.ok) {
                setNewComment("");
                setReplyTo(null);
                fetchComments();
                fetchAnnouncement();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;

        try {
            const res = await fetch(`/api/announcements/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.push("/announcements");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getNetVotes = (upvotes: string[], downvotes: string[]) => {
        return upvotes.length - downvotes.length;
    };

    const getUserVote = (upvotes: string[], downvotes: string[]) => {
        if (!session?.user?.id) return null;
        if (upvotes.includes(session.user.id)) return "upvote";
        if (downvotes.includes(session.user.id)) return "downvote";
        return null;
    };

    const renderComment = (comment: Comment, depth: number = 0) => {
        const userVote = getUserVote(comment.upvotes, comment.downvotes);
        const netVotes = getNetVotes(comment.upvotes, comment.downvotes);

        return (
            <div key={comment._id} className={`${depth > 0 ? "ml-8 mt-4" : "mt-4"}`}>
                <div className="glass-card p-4 rounded-lg">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => session && handleCommentVote(comment._id, "upvote")}
                                disabled={!session}
                                className={`p-1 rounded hover:bg-secondary ${
                                    userVote === "upvote" ? "text-orange-500" : "text-muted-foreground"
                                }`}
                            >
                                <ArrowBigUp size={16} fill={userVote === "upvote" ? "currentColor" : "none"} />
                            </button>
                            <span className="text-xs font-bold">{netVotes}</span>
                            <button
                                onClick={() => session && handleCommentVote(comment._id, "downvote")}
                                disabled={!session}
                                className={`p-1 rounded hover:bg-secondary ${
                                    userVote === "downvote" ? "text-blue-500" : "text-muted-foreground"
                                }`}
                            >
                                <ArrowBigDown size={16} fill={userVote === "downvote" ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <span className="font-bold text-foreground">{comment.authorId.name}</span>
                                <span>•</span>
                                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                            {session && (
                                <button
                                    onClick={() => setReplyTo(comment._id)}
                                    className="text-xs text-primary hover:underline mt-2"
                                >
                                    Reply
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {comment.replies && comment.replies.map((reply) => renderComment(reply, depth + 1))}
            </div>
        );
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!announcement) return <div className="min-h-screen flex items-center justify-center">Announcement not found</div>;

    const userVote = getUserVote(announcement.upvotes, announcement.downvotes);
    const netVotes = getNetVotes(announcement.upvotes, announcement.downvotes);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <button
                        onClick={() => router.push("/announcements")}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft size={20} />
                        Back to announcements
                    </button>
                </div>
            </div>

            {/* Announcement */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="glass-card rounded-xl overflow-hidden">
                    <div className="flex gap-4 p-6">
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => session && handleVote("upvote")}
                                disabled={!session}
                                className={`p-2 rounded hover:bg-secondary ${
                                    userVote === "upvote" ? "text-orange-500" : "text-muted-foreground"
                                }`}
                            >
                                <ArrowBigUp size={32} fill={userVote === "upvote" ? "currentColor" : "none"} />
                            </button>
                            <span className={`text-xl font-bold ${netVotes > 0 ? "text-orange-500" : netVotes < 0 ? "text-blue-500" : ""}`}>
                                {netVotes}
                            </span>
                            <button
                                onClick={() => session && handleVote("downvote")}
                                disabled={!session}
                                className={`p-2 rounded hover:bg-secondary ${
                                    userVote === "downvote" ? "text-blue-500" : "text-muted-foreground"
                                }`}
                            >
                                <ArrowBigDown size={32} fill={userVote === "downvote" ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold mb-2">{announcement.title}</h1>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                        <span>by {announcement.authorId.name}</span>
                                        <span>•</span>
                                        <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {session && (session.user.id === announcement.authorId._id || session.user.role === 'superadmin') && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                            <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
                        </div>
                    </div>
                </div>

                {/* Comment Form */}
                {session && (
                    <div className="mt-6">
                        <form onSubmit={handlePostComment} className="space-y-3">
                            {replyTo && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    Replying to comment
                                    <button
                                        type="button"
                                        onClick={() => setReplyTo(null)}
                                        className="text-primary hover:underline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
                                required
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                            >
                                Post Comment
                            </button>
                        </form>
                    </div>
                )}

                {/* Comments */}
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MessageSquare size={20} />
                        {announcement.commentCount} Comments
                    </h2>
                    {comments.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No comments yet. Be the first to comment!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => renderComment(comment))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
