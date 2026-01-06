"use client";

import { useState, useEffect } from "react";
import { User, Shield, UserMinus, Ban, Crown, MessageSquare } from "lucide-react";

export default function MembersList({ serverId, canManage, isOwner }: { serverId: string, canManage: boolean, isOwner: boolean }) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, [serverId]);

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
        if (!confirm("Kick this user?")) return;
        try {
            const res = await fetch(`/api/servers/${serverId}/kick`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) fetchMembers();
            else alert("Failed to kick");
        } catch (e) { console.error(e); }
    };

    const handleBan = async (userId: string) => {
        const reason = prompt("Ban reason?");
        if (!reason) return;
        try {
            const res = await fetch(`/api/servers/${serverId}/ban`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, reason }),
            });
            if (res.ok) fetchMembers();
            else alert("Failed to ban");
        } catch (e) { console.error(e); }
    };

    const handleTransfer = async (userId: string) => {
        if (!confirm("Are you sure? requesting to transfer ownership to this user. You will lose owner privileges.")) return;
        try {
            const res = await fetch(`/api/servers/${serverId}/transfer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newOwnerId: userId }),
            });
            if (res.ok) {
                alert("Ownership transferred. Reloading...");
                window.location.reload();
            }
            else alert("Failed to transfer");
        } catch (e) { console.error(e); }
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
                                            const res = await fetch("/api/conversations", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ remoteUserId: member.userId._id })
                                            });
                                            if (res.ok) {
                                                const conv = await res.json();
                                                // Use window.location as useRouter might not be available/passed or we can just navigate
                                                // Actually, MembersList is a client component, let's use useRouter if available or window.location
                                                window.location.href = `/community/me/${conv._id}`;
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
