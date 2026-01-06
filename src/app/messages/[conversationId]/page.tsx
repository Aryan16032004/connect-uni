"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, Paperclip, Phone, Video, ArrowLeft, User, Smile, X, Info } from "lucide-react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useSocket } from "@/components/providers/SocketProvider";
import ImageUpload from "@/components/ImageUpload";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface Message {
    _id: string;
    content: string;
    senderId: any;
    conversationId: string;
    attachments: string[];
    createdAt: string;
    edited: boolean;
}

interface Conversation {
    _id: string;
    type: 'direct' | 'group';
    memberOneId?: any;
    memberTwoId?: any;
    members?: any[];
    name?: string;
    image?: string;
}

export default function MessagesPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { socket } = useSocket();

    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const conversationId = (params?.conversationId as string) || "";

    useEffect(() => {
        if (conversationId) {
            fetchConversation();
            fetchMessages();
        }
    }, [conversationId]);

    useEffect(() => {
        if (!socket || !conversationId) return;

        socket.emit("join-room", conversationId);

        const handleNewMessage = (message: Message) => {
            setMessages(prev => {
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
            scrollToBottom();
        };

        socket.on("new-message", handleNewMessage);
        return () => {
            socket.off("new-message", handleNewMessage);
            socket.emit("leave-room", conversationId);
        };
    }, [socket, conversationId]);

    // Polling fallback for messages - check every 3 seconds
    useEffect(() => {
        if (!conversationId) return;

        const pollInterval = setInterval(() => {
            fetchMessages();
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [conversationId]);

    const fetchConversation = async () => {
        try {
            const res = await fetch(`/api/chats/${conversationId}`);
            if (res.ok) {
                const data = await res.json();
                setConversation(data);
            }
        } catch (error) {
            console.error("Error fetching conversation:", error);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chats/${conversationId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                scrollToBottom();
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && attachments.length === 0) || !session) return;

        try {
            const res = await fetch(`/api/chats/${conversationId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newMessage,
                    attachments,
                }),
            });

            if (res.ok) {
                const msg = await res.json();
                setMessages(prev => [...prev, msg]);
                setNewMessage("");
                setAttachments([]);
                scrollToBottom();

                if (socket) {
                    socket.emit("send-message", { ...msg, conversationId });
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const getOtherUser = () => {
        if (!conversation) return null;
        if (conversation.type === 'direct') {
            return session?.user?.id === conversation.memberOneId?._id
                ? conversation.memberTwoId
                : conversation.memberOneId;
        }
        return null;
    };

    const getDisplayName = () => {
        if (conversation?.type === 'group') {
            return conversation.name;
        }
        const otherUser = getOtherUser();
        return otherUser?.name || "Loading...";
    };

    const otherUser = getOtherUser();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header */}
            <div className="h-16 px-6 border-b border-border flex items-center justify-between glass-header backdrop-blur-md sticky top-0 z-10 bg-background/80">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="md:hidden p-2 hover:bg-muted rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden">
                            {conversation?.image ? (
                                <img src={conversation.image} alt={getDisplayName()} className="w-full h-full object-cover" />
                            ) : otherUser?.image ? (
                                <img src={otherUser.image} alt={otherUser.name} className="w-full h-full object-cover" />
                            ) : (
                                getDisplayName()[0]
                            )}
                        </div>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">{getDisplayName()}</h2>
                        <p className="text-xs text-muted-foreground font-medium h-4">
                            {otherUser?.status === 'online' ? (
                                <span className="text-emerald-500">Active now</span>
                            ) : (
                                "Offline"
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-all"
                    >
                        <Info size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No messages yet. Start a conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId?._id === session?.user?.id;
                        const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId?._id !== msg.senderId?._id);

                        return (
                            <div key={msg._id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {!isMe && (
                                    <div className="w-8 h-8 shrink-0 mb-1">
                                        {showAvatar ? (
                                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                                {msg.senderId?.image ? (
                                                    <img src={msg.senderId.image} className="w-full h-full object-cover" alt={msg.senderId.name} />
                                                ) : (
                                                    <span className="text-xs font-bold">{msg.senderId?.name?.[0]}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-8" />
                                        )}
                                    </div>
                                )}

                                <div className={`flex flex-col gap-1 max-w-[70%] sm:max-w-[60%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {/* Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {msg.attachments.map((url: string, idx: number) => (
                                                <div key={idx} className="rounded-xl overflow-hidden border border-border shadow-sm">
                                                    <img src={url} alt="attachment" className="w-full h-auto" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Text Content */}
                                    {msg.content && (
                                        <div className={`
                                            px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed
                                            ${isMe
                                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-none'
                                                : 'bg-secondary text-foreground rounded-bl-none border border-border/50'
                                            }
                                        `}>
                                            {msg.content}
                                            {msg.edited && <span className="text-xs opacity-70 ml-2">(edited)</span>}
                                        </div>
                                    )}

                                    <span className="text-[10px] text-muted-foreground px-1 opacity-70">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background z-20">
                {/* Upload Preview */}
                {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 p-2 bg-secondary/30 rounded-lg overflow-x-auto">
                        {attachments.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border group shrink-0">
                                <img src={url} className="w-full h-full object-cover" alt="attachment" />
                                <button
                                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSend} className="flex items-end gap-2 bg-secondary/40 border border-border/50 p-2 rounded-[24px] shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all duration-300">
                    <button
                        type="button"
                        className="p-3 text-muted-foreground hover:text-indigo-500 hover:bg-background rounded-full transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? <span className="animate-spin text-indigo-500">⏳</span> : <Paperclip size={20} />}
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploading(true);
                            try {
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("folder", "chat-attachments");

                                const res = await fetch("/api/upload", {
                                    method: "POST",
                                    body: formData
                                });

                                if (res.ok) {
                                    const data = await res.json();
                                    setAttachments(prev => [...prev, data.url]);
                                }
                            } catch (error) {
                                console.error("Upload error:", error);
                            } finally {
                                setUploading(false);
                            }
                        }}
                        accept="image/*"
                    />

                    <div className="relative">
                        <button
                            type="button"
                            className="p-3 text-muted-foreground hover:text-yellow-500 hover:bg-background rounded-full transition-colors"
                            onClick={() => setShowEmoji(!showEmoji)}
                        >
                            <Smile size={20} />
                        </button>
                        {showEmoji && (
                            <div className="absolute bottom-12 left-0 shadow-2xl rounded-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 z-50">
                                <EmojiPicker onEmojiClick={(e: any) => {
                                    setNewMessage(prev => prev + e.emoji);
                                    setShowEmoji(false);
                                }} width={300} height={400} />
                            </div>
                        )}
                    </div>

                    <textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70 py-3 max-h-32 resize-none"
                        rows={1}
                    />

                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && attachments.length === 0) || uploading}
                        className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
