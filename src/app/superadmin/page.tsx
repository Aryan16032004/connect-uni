"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Server, Calendar, ShoppingBag, Megaphone, Trash2, Shield, TrendingUp, Clock } from "lucide-react";

export default function SuperAdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        } else if (status === "authenticated") {
            if (session.user.role !== 'superadmin') {
                router.push("/");
            } else {
                fetchDashboard();
            }
        }
    }, [status, session, router]);

    const fetchDashboard = async () => {
        try {
            const res = await fetch("/api/superadmin/dashboard");
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type: string, id: string) => {
        if (!confirm(`Are you sure you want to permanently delete this ${type}? This action cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/superadmin/delete/${type}/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                alert(`${type} deleted successfully`);
                fetchDashboard();
            } else {
                alert("Failed to delete");
            }
        } catch (error) {
            console.error(error);
            alert("Error occurred");
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    if (!stats) return null;

    const statCards = [
        { icon: Users, label: "Total Users", value: stats.stats.totalUsers, color: "from-blue-500 to-blue-600", lightColor: "bg-blue-500/10 text-blue-500" },
        { icon: Server, label: "Total Servers", value: stats.stats.totalServers, color: "from-purple-500 to-purple-600", lightColor: "bg-purple-500/10 text-purple-500" },
        { icon: Calendar, label: "Total Events", value: stats.stats.totalEvents, color: "from-green-500 to-green-600", lightColor: "bg-green-500/10 text-green-500" },
        { icon: ShoppingBag, label: "Total Products", value: stats.stats.totalProducts, color: "from-amber-500 to-amber-600", lightColor: "bg-amber-500/10 text-amber-500" },
        { icon: Megaphone, label: "Announcements", value: stats.stats.totalAnnouncements, color: "from-orange-500 to-orange-600", lightColor: "bg-orange-500/10 text-orange-500" },
    ];

    const sections = [
        { id: 'users', label: 'Users', icon: Users, data: stats.recentUsers, color: 'blue' },
        { id: 'events', label: 'Events', icon: Calendar, data: stats.recentEvents, color: 'green' },
        { id: 'products', label: 'Products', icon: ShoppingBag, data: stats.recentProducts, color: 'amber' },
        { id: 'announcements', label: 'Announcements', icon: Megaphone, data: stats.recentAnnouncements, color: 'orange' },
        { id: 'servers', label: 'Servers', icon: Server, data: stats.recentServers, color: 'purple' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                                <Shield size={24} />
                            </div>
                            <h1 className="text-4xl font-bold">Super Admin Dashboard</h1>
                        </div>
                        <p className="text-muted-foreground">Manage all platform content and users</p>
                    </div>
                    <div className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-sm font-bold">
                        🔒 SUPER ADMIN
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {statCards.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <div key={idx} className="group">
                                <div className="glass-card p-6 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                                    <div className={`w-12 h-12 rounded-lg ${card.lightColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="text-4xl font-bold mb-1">{card.value}</div>
                                    <div className="text-sm text-muted-foreground">{card.label}</div>
                                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                        <TrendingUp size={12} />
                                        <span>View details</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sections.map((section) => {
                        const Icon = section.icon;
                        const colorClasses = {
                            blue: 'from-blue-500 to-blue-600',
                            green: 'from-green-500 to-green-600',
                            amber: 'from-amber-500 to-amber-600',
                            orange: 'from-orange-500 to-orange-600',
                            purple: 'from-purple-500 to-purple-600',
                        };
                        
                        return (
                            <div key={section.id} className="glass-card rounded-xl border border-border/50 overflow-hidden">
                                {/* Section Header */}
                                <button
                                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                                    className="w-full p-6 flex items-center justify-between bg-gradient-to-r from-muted/50 to-transparent hover:from-muted hover:to-muted/50 transition-all border-b border-border/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[section.color as keyof typeof colorClasses]} text-white flex items-center justify-center`}>
                                            <Icon size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-lg">Recent {section.label}</h3>
                                            <p className="text-xs text-muted-foreground">{section.data?.length || 0} entries</p>
                                        </div>
                                    </div>
                                    <div className={`transform transition-transform duration-300 ${expandedSection === section.id ? 'rotate-180' : ''}`}>
                                        <span className="text-2xl text-muted-foreground">▼</span>
                                    </div>
                                </button>

                                {/* Section Content */}
                                {expandedSection === section.id && (
                                    <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                                        {section.data && section.data.length > 0 ? (
                                            section.data.map((item: any) => (
                                                <div key={item._id} className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/30 transition-all group">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold truncate">
                                                            {item.name || item.title || item.email || 'Unknown'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate mt-1">
                                                            {item.email || item.organizerId?.name || item.sellerId?.name || item.authorId?.name || item.ownerId?.name}
                                                        </div>
                                                        {item.role && (
                                                            <span className="inline-block text-xs px-2 py-1 mt-2 bg-primary/20 text-primary rounded">
                                                                {item.role}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const type = section.id.slice(0, -1); // Remove 's' from plural
                                                            const actualType = type === 'serie' ? 'series' : type === 'event' ? 'event' : type === 'product' ? 'product' : type === 'announcement' ? 'announcement' : 'server';
                                                            handleDelete(actualType, item._id);
                                                        }}
                                                        className="ml-3 p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Icon size={32} className="mx-auto mb-2 opacity-30" />
                                                <p>No {section.label.toLowerCase()} yet</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
