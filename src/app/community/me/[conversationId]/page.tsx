"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Send, Paperclip, Phone, Video, ArrowLeft, User, Smile, Image as ImageIcon, File as FileIcon, X } from "lucide-react";
import MediaRoom from "@/components/server/MediaRoom";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useSocket } from "@/components/providers/SocketProvider";
import { useRTM } from "@/components/providers/RTMProvider";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export default function DirectMessagePage() {
    const params = useParams();
    const conversationId = params?.conversationId as string;
    const router = useRouter();
    const { data: session } = useSession();

    const { socket, isConnected } = useSocket();
    const { rtmClient } = useRTM();

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [isCalling, setIsCalling] = useState(false);
    const [isVideo, setIsVideo] = useState(false);
    const [otherTyping, setOtherTyping] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Messages
    useEffect(() => {
        if (conversationId) fetchMessages();
    }, [conversationId]);

    // Socket.io Integration
    useEffect(() => {
        if (!socket || !conversationId) return;

        socket.emit("join-room", conversationId);

        const handleNewMessage = (message: any) => {
            // Avoid duplication if the message is from self (though usually optimistic update handles this, 
            // but if we blindly append, we might duplicate. 
            // Ideally the sender shouldn't listent to their own echo or we dedup by ID)
            setMessages(prev => {
                if (prev.some(m => m._id === message._id)) return prev;
                return [...prev, message];
            });
            scrollToBottom();
        };

        const handleTyping = (data: any) => {
            if (data.conversationId === conversationId && data.userId !== session?.user?.id) {
                setOtherTyping(data.status);
            }
        };

        socket.on("new-message", handleNewMessage);
        socket.on("typing", handleTyping);

        return () => {
            socket.off("new-message", handleNewMessage);
            socket.off("typing", handleTyping);
        };
    }, [socket, conversationId, session?.user?.id]);


    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/conversations/${conversationId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                scrollToBottom();
            }
        } catch (error) {
            console.error(error);
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
            const messageData = {
                content: newMessage,
                attachments: attachments
            };

            const res = await fetch(`/api/conversations/${conversationId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(messageData),
            });

            if (res.ok) {
                const msg = await res.json();

                // Optimistic update
                setMessages(prev => [...prev, msg]);
                setNewMessage("");
                setAttachments([]);
                scrollToBottom();

                // Socket Emit
                if (socket) {
                    socket.emit("send-message", { ...msg, conversationId });
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setAttachments(prev => [...prev, data.url]);
        } catch (error) {
            alert("Failed to upload file");
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowEmoji(false);
    };

    // Typing Logic
    const typingTimeoutRef = useRef<any>(null);
    const handleInputChange = (value: string) => {
        setNewMessage(value);

        if (socket) {
            socket.emit("typing", { conversationId, userId: session?.user?.id, status: true });
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socket) {
                socket.emit("typing", { conversationId, userId: session?.user?.id, status: false });
            }
        }, 2000);
    };


    // Auto Join & Call Logic
    const searchParams = useSearchParams();
    const autoJoin = searchParams ? searchParams.get("autoJoin") : null;
    const videoParam = searchParams ? searchParams.get("video") : null;

    useEffect(() => {
        if (autoJoin === "true") {
            setIsCalling(true);
            setIsVideo(videoParam === "true");
        }
    }, [autoJoin, videoParam]);

    const startCall = async (video: boolean) => {
        if (rtmClient.current && session?.user?.name) {
            rtmClient.current.publish(conversationId, JSON.stringify({
                type: 'call_invite',
                channelId: conversationId,
                callerName: session.user.name,
                callType: video ? 'video' : 'audio'
            })).catch(console.error);
        }
        setIsVideo(video);
        setIsCalling(true);
    };

    if (isCalling) {
        return (
            <div className="flex flex-col h-full bg-black text-white">
                <div className="p-4 flex items-center">
                    <button onClick={() => setIsCalling(false)} className="flex items-center gap-2 hover:bg-white/20 px-3 py-1 rounded transition-colors">
                        <ArrowLeft size={20} /> Back to Chat
                    </button>
                </div>
                <div className="flex-1">
                    <MediaRoom channelId={conversationId} video={isVideo} />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header */}
            <div className="h-16 px-6 border-b border-border flex items-center justify-between glass-header backdrop-blur-md sticky top-0 z-10 bg-background/80">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/community')} className="md:hidden p-2 hover:bg-muted rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            <User size={20} />
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${otherTyping ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">Direct Message</h2>
                        <p className="text-xs text-muted-foreground font-medium h-4">
                            {otherTyping ? <span className="text-emerald-500 animate-pulse">Typing...</span> : "Active now"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => startCall(false)} className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all duration-300">
                        <Phone size={20} />
                    </button>
                    <button onClick={() => startCall(true)} className="w-10 h-10 rounded-full bg-secondary/50 hover:bg-pink-500 hover:text-white flex items-center justify-center transition-all duration-300">
                        <Video size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">Loading conversation...</div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId?._id === session?.user?.id;
                        const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId?._id !== msg.senderId?._id);

                        return (
                            <div key={msg._id || index} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {!isMe && (
                                    <div className="w-8 h-8 shrink-0 mb-1">
                                        {showAvatar ? (
                                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                                {msg.senderId?.image ? <img src={msg.senderId.image} className="w-full h-full object-cover" /> : <User size={14} />}
                                            </div>
                                        ) : <div className="w-8" />}
                                    </div>
                                )}

                                <div className={`flex flex-col gap-1 max-w-[70%] sm:max-w-[60%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {/* Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {msg.attachments.map((url: string, idx: number) => (
                                                <div key={idx} className="rounded-xl overflow-hidden border border-border shadow-sm max-h-60">
                                                    <img src={url} alt="attachment" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500" />
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
                                        </div>
                                    )}

                                    <span className="text-[10px] text-muted-foreground px-1 opacity-70">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )
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
                                <img src={url} className="w-full h-full object-cover" />
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

                <div className="flex items-end gap-2 bg-secondary/40 border border-border/50 p-2 rounded-[24px] shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all duration-300">
                    <button
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
                        onChange={handleFileUpload}
                        accept="image/*"
                    />

                    <div className="relative">
                        <button
                            className="p-3 text-muted-foreground hover:text-yellow-500 hover:bg-background rounded-full transition-colors"
                            onClick={() => setShowEmoji(!showEmoji)}
                        >
                            <Smile size={20} />
                        </button>
                        {showEmoji && (
                            <div className="absolute bottom-12 left-0 shadow-2xl rounded-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                                <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                            </div>
                        )}
                    </div>

                    <textarea
                        value={newMessage}
                        onChange={e => handleInputChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e) }}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70 py-3 max-h-32 resize-none"
                        rows={1}
                    />

                    <button
                        onClick={() => handleSend()}
                        disabled={(!newMessage.trim() && attachments.length === 0) || uploading}
                        className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
