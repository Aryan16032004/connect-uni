"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Settings, LogOut, X, Save, Trash2, Shield, UserMinus, Ban, Plus, UserPlus } from "lucide-react";
import ChannelItem from '@/components/server/ChannelItem';
import { useSession } from "next-auth/react";
import ServerSettingsModal from "@/components/server/SettingServer";
import CreateChannelModal from "@/components/server/CreateChannelModal";
import InviteManager from "@/components/server/InviteManager";
import { useSocket } from "@/components/providers/SocketProvider";

export default function ServerLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { socket } = useSocket();
    const serverId = params?.serverId as string;

    const [server, setServer] = useState<any>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [member, setMember] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showInvite, setShowInvite] = useState(false);

    // Create Channel State
    const [createChannelType, setCreateChannelType] = useState<"text" | "audio" | "video" | null>(null);

    useEffect(() => {
        if (serverId) fetchServerDetails();
    }, [serverId]);

    // Listen for kick/ban events
    useEffect(() => {
        if (!socket || !session?.user?.id) return;

        const handleKicked = (data: { userId: string; serverId: string; serverName: string }) => {
            if (data.userId === session.user.id && data.serverId === serverId) {
                alert(`You have been kicked by the admin of ${data.serverName}`);
                router.push("/community");
            }
        };

        const handleBanned = (data: { userId: string; serverId: string; serverName: string }) => {
            if (data.userId === session.user.id && data.serverId === serverId) {
                alert(`You have been banned from ${data.serverName}`);
                router.push("/community");
            }
        };

        socket.on("user:kicked", handleKicked);
        socket.on("user:banned", handleBanned);

        return () => {
            socket.off("user:kicked", handleKicked);
            socket.off("user:banned", handleBanned);
        };
    }, [socket, session?.user?.id, serverId, router]);

    const fetchServerDetails = async () => {
        try {
            const res = await fetch(`/api/servers/${serverId}`);
            if (res.ok) {
                const data = await res.json();
                setServer(data.server);
                setChannels(data.channels);
                setMember(data.member);
            } else {
                router.push("/community"); // Redirect if invalid
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Server...</div>;
    if (!server) return null;

    // Permission Check
    const isOwner = session?.user?.id === server.ownerId;

    let isAdmin = false;
    if (member && server && member.roles) {
        const adminRole = server.roles.find((r: any) => r.name === "Admin");
        if (adminRole && member.roles.includes(adminRole._id)) {
            isAdmin = true;
        }
    }

    const canManage = isOwner || isAdmin;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Server Sidebar */}
            <div className="w-64 bg-secondary/5 border-r border-border flex flex-col shrink-0">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                    <button
                        onClick={() => router.push('/community')}
                        className="p-1 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
                        title="Back to Hub"
                    >
                        <Shield size={20} className="rotate-90 md:rotate-0 transform" />
                    </button>
                    <div className="flex-1 min-w-0 flex items-center justify-between group">
                        <h1 className="font-bold text-lg truncate">{server.name}</h1>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowInvite(true)}
                                className="text-muted-foreground hover:text-indigo-500 p-1 rounded hover:bg-background/50 transition-colors"
                                title="Invite People"
                            >
                                <UserPlus size={18} />
                            </button>
                            {canManage && (
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background/50"
                                    title="Server Settings"
                                >
                                    <Settings size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Channels List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {/* Text Channels */}
                    <div>
                        <div className="flex justify-between items-center group px-2 mb-1">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Text Channels</h3>
                            {canManage && (
                                <button
                                    onClick={() => setCreateChannelType('text')}
                                    className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-background/50"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            {channels.filter(c => c.type === 'text').map(channel => (
                                <ChannelItem key={channel._id} channel={channel} serverId={serverId} />
                            ))}
                        </div>
                    </div>

                    {/* Voice Channels */}
                    <div>
                        <div className="flex justify-between items-center group px-2 mb-1">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Voice Channels</h3>
                            {canManage && (
                                <button
                                    onClick={() => setCreateChannelType('audio')}
                                    className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-background/50"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            {channels.filter(c => c.type === 'audio').map(channel => (
                                <ChannelItem key={channel._id} channel={channel} serverId={serverId} />
                            ))}
                        </div>
                    </div>

                    {/* Video Channels */}
                    <div>
                        <div className="flex justify-between items-center group px-2 mb-1">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Video Channels</h3>
                            {canManage && (
                                <button
                                    onClick={() => setCreateChannelType('video')}
                                    className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-background/50"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            {channels.filter(c => c.type === 'video').map(channel => (
                                <ChannelItem key={channel._id} channel={channel} serverId={serverId} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* User User Bar (Mini) */}
                <div className="p-3 bg-secondary/10 border-t border-border flex items-center gap-2">
                    <div className="text-xs">
                        <div className="font-bold">{session?.user?.name || "You"}</div>
                        <div className="text-muted-foreground">Online</div>
                    </div>
                </div>
            </div>

            {/* Main Content (Chat or Voice) */}
            <div className="flex-1 flex flex-col bg-background min-w-0">
                {children}
            </div>

            {/* Rules Acceptance Modal */}
            {server.rules && member && !member.rulesAccepted && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-border text-center">
                            <h2 className="text-2xl font-bold mb-2">Welcome to {server.name}</h2>
                            <p className="text-muted-foreground text-sm">You must accept the rules to join the conversation.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-secondary/5 prose prose-sm dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{server.rules}</pre>
                        </div>
                        <div className="p-6 border-t border-border flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/servers/${serverId}/rules/accept`, { method: "POST" });
                                        if (res.ok) {
                                            await fetchServerDetails();
                                        } else {
                                            const errorData = await res.json().catch(() => ({ error: 'Failed to accept rules' }));
                                            alert(errorData.error || 'Failed to accept rules. Please try again.');
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert('Network error. Please check your connection and try again.');
                                    }
                                }}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                            >
                                I Accept the Rules
                            </button>
                            <button
                                onClick={() => router.push('/community')}
                                className="w-full text-muted-foreground hover:text-foreground text-sm"
                            >
                                Decline and Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Channel Modal */}
            {createChannelType && (
                <CreateChannelModal
                    serverId={serverId}
                    type={createChannelType}
                    onClose={() => setCreateChannelType(null)}
                    onCreated={() => { fetchServerDetails(); setCreateChannelType(null); }}
                />
            )}

            {/* Settings Modal */}
            {showSettings && (
                <ServerSettingsModal
                    server={server}
                    onClose={() => setShowSettings(false)}
                    onUpdate={() => { fetchServerDetails(); setShowSettings(false); }}
                    canManage={canManage}
                    isOwner={isOwner}
                />
            )}

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowInvite(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={20} /></button>
                        <h2 className="text-xl font-bold mb-4">Invite Friends</h2>
                        <InviteManager serverId={serverId} />
                    </div>
                </div>
            )}
        </div>
    );
}
