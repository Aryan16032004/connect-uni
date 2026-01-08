"use client"

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import MembersList from "@/components/server/MembersList";
import InviteManager from "@/components/server/InviteManager";
import { Settings, LogOut, X, Save, Trash2, Shield, UserMinus, Ban } from "lucide-react";
import clsx from "clsx";
import { useSocket } from "@/components/providers/SocketProvider";


export default function ServerSettingsModal({ server, onClose, onUpdate, canManage, isOwner }: any) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");

    // Overview State
    const [name, setName] = useState(server.name);
    const [rules, setRules] = useState(server.rules || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert("Server name cannot be empty");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/servers/${server._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), rules }),
            });
            if (res.ok) {
                onUpdate();
                alert("Settings saved successfully!");
            } else {
                const errorData = await res.json().catch(() => ({ message: 'Failed to update server' }));
                alert(errorData.message || "Failed to update server");
            }
        } catch (error) {
            console.error(error);
            alert("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this server? This action cannot be undone.")) return;
        if (!confirm("This will permanently delete all channels, messages, and member data. Type DELETE to confirm.")) return;
        try {
            const res = await fetch(`/api/servers/${server._id}`, { method: "DELETE" });
            if (res.ok) {
                alert("Server deleted successfully");
                router.push("/community");
            } else {
                const errorData = await res.json().catch(() => ({ message: 'Failed to delete server' }));
                alert(errorData.message || "Failed to delete server");
            }
        } catch (error) { 
            console.error(error);
            alert("Network error. Please try again.");
        }
    };

    const handleLeave = async () => {
        if (!confirm("Are you sure you want to leave this server?")) return;
        try {
            const res = await fetch(`/api/servers/${server._id}/leave`, { method: "DELETE" });
            if (res.ok) router.push("/community");
            else {
                const data = await res.json();
                alert(data.message || "Failed to leave");
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex overflow-hidden animate-in fade-in zoom-in-95">
                {/* Sidebar */}
                <div className="w-48 bg-secondary/10 border-r border-border p-4 flex flex-col gap-1">
                    <h2 className="font-bold text-sm uppercase text-muted-foreground mb-2 px-2">Settings</h2>
                    {['overview', 'members', 'invites', 'blocked'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "text-left px-3 py-2 rounded-md text-sm font-medium transition-colors capitalize",
                                activeTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {tab}
                        </button>
                    ))}

                    <div className="mt-auto pt-4 border-t border-border">
                        <button
                            onClick={handleLeave}
                            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                        >
                            <LogOut size={16} /> Leave Server
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold capitalize">{activeTab}</h2>
                        <button onClick={onClose}><X size={20} className="text-muted-foreground hover:text-foreground" /></button>
                    </div>

                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Server Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Community Rules</label>
                                <textarea
                                    value={rules}
                                    onChange={(e) => setRules(e.target.value)}
                                    className="w-full h-32 bg-input border border-border rounded-md px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
                                    placeholder="Set guidelines for your community..."
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {saving ? "Saving..." : <><Save size={16} /> Save Changes</>}
                            </button>

                            <div className="pt-8 mt-8 border-t border-border">
                                <h3 className="font-bold text-red-500 mb-2">Danger Zone</h3>
                                <button
                                    onClick={handleDelete}
                                    className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={16} /> Delete Server
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && <MembersList serverId={server._id} canManage={canManage} isOwner={isOwner} />}
                    {activeTab === 'invites' && <InviteManager serverId={server._id} />}
                    {activeTab === 'blocked' && <BlockedUsersList serverId={server._id} />}

                </div>
            </div>
        </div>
    );
}

function BlockedUsersList({ serverId }: { serverId: string }) {
    const [bans, setBans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    useEffect(() => {
        fetchBans();
    }, [serverId]);

    // Listen for real-time ban updates
    useEffect(() => {
        if (!socket) return;

        const handleMemberBanned = (data: { serverId: string, userId: string }) => {
            if (data.serverId === serverId) {
                fetchBans(); // Refresh ban list when someone is banned
            }
        };

        socket.on("member:banned", handleMemberBanned);

        return () => {
            socket.off("member:banned", handleMemberBanned);
        };
    }, [socket, serverId]);

    const fetchBans = async () => {
        try {
            const res = await fetch(`/api/servers/${serverId}/bans`);
            if (res.ok) setBans(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleUnban = async (userId: string) => {
        if (!confirm("Unblock this user?")) return;
        try {
            const res = await fetch(`/api/servers/${serverId}/bans/${userId}`, { method: "DELETE" });
            if (res.ok) {
                setBans(prev => prev.filter(b => b.userId._id !== userId));
            } else {
                alert("Failed to unblock");
            }
        } catch (e) { console.error(e); }
    };

    if (loading) return <div className="text-center p-4 text-muted-foreground">Loading blocked users...</div>;

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg">Blocked Users</h3>
            {bans.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
                    <Shield size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No blocked users.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {bans.map((ban) => (
                        <div key={ban._id} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-secondary/20 overflow-hidden">
                                    {ban.userId.image ? (
                                        <img src={ban.userId.image} alt={ban.userId.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full font-bold">{ban.userId.name?.[0]}</div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold">{ban.userId.name}</div>
                                    <div className="text-xs text-muted-foreground">@{ban.userId.username} • {ban.reason || "No reason provided"}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleUnban(ban.userId._id)}
                                className="text-red-500 hover:bg-red-500/10 px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
