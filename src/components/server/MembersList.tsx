"use client";

import { useState, useEffect } from "react";
import { User, Shield, UserMinus, Ban, Crown, MessageSquare } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";

export default function MembersList({ serverId, canManage, isOwner }: { serverId: string, canManage: boolean, isOwner: boolean }) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    useEffect(() => {
        fetchMembers();
    }, [serverId]);

    // Listen for real-time member changes
    useEffect(() => {
        if (!socket) return;

        const handleMemberJoin = (data: { serverId: string }) => {
            if (data.serverId === serverId) {
                fetchMembers();
            }
        };

        const handleMemberLeave = (data: { serverId: string }) => {
            if (data.serverId === serverId) {
                fetchMembers();
            }
        };

        const handleMemberKicked = (data: { serverId: string, userId: string }) => {
            if (data.serverId === serverId) {
                // Optimistically remove the member from the list
                setMembers(prev => prev.filter(m => m.userId?._id !== data.userId));
            }
        };

        const handleMemberBanned = (data: { serverId: string, userId: string }) => {
            if (data.serverId === serverId) {
                // Optimistically remove the member from the list
                setMembers(prev => prev.filter(m => m.userId?._id !== data.userId));
            }
        };

        socket.on("member:joined", handleMemberJoin);
        socket.on("member:left", handleMemberLeave);
        socket.on("member:kicked", handleMemberKicked);
        socket.on("member:banned", handleMemberBanned);

        return () => {
            socket.off("member:joined", handleMemberJoin);
            socket.off("member:left", handleMemberLeave);
            socket.off("member:kicked", handleMemberKicked);
            socket.off("member:banned", handleMemberBanned);
        };
    }, [socket, serverId]);

    const fetchMembers = async () => {
        try {
            // We don't have a direct /api/servers/[id]/members endpoint yet. 
            // We need to fetch details. Let's assume for now we hit the main server endpoint which returns 'server', 'channels', 'member'.
            // Actually, we need a list of ALL members.
            // Let's create a quick API for listing members or reuse server details if it includes them? 
            // Server details usually doesn't include ALL members for scalability.
            // We need to Create GET /api/servers/[id]/members first? 
            // OR we can implement it here.

            // Wait, I missed creating the GET Members API. 
            // Let's stub this with a TODO or implement the API quickly.
            // For now, let's assuming we ADDED it or will add it.
            // Actually, I should create the API first.
            // But let's write the UI presuming the API exists: GET /api/servers/[serverId]/members
            const res = await fetch(`/api/servers/${serverId}/members`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleKick = async (userId: string) => {
        if (!confirm("Kick this user? They will be able to rejoin the server.")) return;
        try {
            const res = await fetch(`/api/servers/${serverId}/kick`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                const data = await res.json();
                alert(data.message || "User kicked successfully");
                // fetchMembers() removed - socket will handle the update
            } else {
                const errorData = await res.json().catch(() => ({ message: 'Failed to kick user' }));
                alert(errorData.message || "Failed to kick user");
            }
        } catch (e) { 
            console.error(e);
            alert("Network error. Please try again.");
        }
    };

    const handleBan = async (userId: string) => {
        const reason = prompt("Ban reason? (This will permanently prevent the user from rejoining)");
        if (reason === null) return; // User cancelled
        try {
            const res = await fetch(`/api/servers/${serverId}/ban`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, reason: reason || "No reason provided" }),
            });
            if (res.ok) {
                const data = await res.json();
                alert(data.message || "User banned successfully");
                // fetchMembers() removed - socket will handle the update
            } else {
                const errorData = await res.json().catch(() => ({ message: 'Failed to ban user' }));
                alert(errorData.message || "Failed to ban user");
            }
        } catch (e) { 
            console.error(e);
            alert("Network error. Please try again.");
        }
    };

    const handleTransfer = async (userId: string) => {
        if (!confirm("Are you sure? Transferring ownership to this user will remove your owner privileges permanently.")) return;
        try {
            const res = await fetch(`/api/servers/${serverId}/transfer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newOwnerId: userId }),
            });
            if (res.ok) {
                alert("Ownership transferred successfully. Reloading...");
                window.location.reload();
            } else {
                const errorData = await res.json().catch(() => ({ message: 'Failed to transfer ownership' }));
                alert(errorData.message || "Failed to transfer ownership");
            }
        } catch (e) { 
            console.error(e);
            alert("Network error. Please try again.");
        }
    };

    if (loading) return <div className="text-center p-4">Loading members...</div>;

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg">Server Members ({members.length})</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {members.map(member => {
                    // Safety check for deleted users or bad data
                    if (!member.userId) return null;

                    return (
                        <div key={member._id} className="flex items-center justify-between p-2 bg-secondary/5 rounded-lg hover:bg-secondary/10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {(member.userId.name || "U")[0]}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm flex items-center gap-2">
                                        {member.userId.name || "Unknown User"}
                                        {/* Role Badges */}
                                        {member.roles && member.roles.some((r: any) => r.name === 'Admin') && (
                                            <Shield size={12} className="text-red-500" />
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Message Button */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch("/api/chats", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ memberId: member.userId._id })
                                            });
                                            if (res.ok) {
                                                const conv = await res.json();
                                                // Use window.location as useRouter might not be available/passed or we can just navigate
                                                // Actually, MembersList is a client component, let's use useRouter if available or window.location
                                                window.location.href = `/messages/${conv._id}`;
                                            }
                                        } catch (e) { console.error(e); }
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                                    title="Message"
                                >
                                    <MessageSquare size={16} />
                                </button>

                                {canManage && (
                                    <>
                                        <button onClick={() => handleKick(member.userId._id)} className="p-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded" title="Kick">
                                            <UserMinus size={16} />
                                        </button>
                                        <button onClick={() => handleBan(member.userId._id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded" title="Ban">
                                            <Ban size={16} />
                                        </button>
                                        {isOwner && (
                                            <button onClick={() => handleTransfer(member.userId._id)} className="p-1.5 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded" title="Transfer Ownership">
                                                <Crown size={16} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
