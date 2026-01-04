"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingBag, ArrowLeft, Edit, Trash2, Share2, User, Tag, MessageSquare, IndianRupee } from "lucide-react";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";

interface Bid {
    _id: string;
    userId: {
        _id: string;
        name: string;
        image?: string;
        email: string;
    };
    amount: number;
    message: string;
    createdAt: string;
}

interface Product {
    _id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    image?: string;
    status: 'available' | 'in-bid' | 'sold';
    sellerId: {
        _id: string;
        name: string;
        image?: string;
        email: string;
        role: string;
    };
    bids: Bid[];
    createdAt: string;
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showBidForm, setShowBidForm] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        category: "Textbooks",
        image: "",
        status: "available",
    });
    const [bidData, setBidData] = useState({
        amount: "",
        message: "",
    });

    useEffect(() => {
        if (params?.id) {
            fetchProduct();
        }
    }, [params?.id]);

    const fetchProduct = async () => {
        try {
            const res = await fetch(`/api/store/${params?.id}`);
            if (res.ok) {
                const data = await res.json();
                setProduct(data);
                setFormData({
                    title: data.title || "",
                    description: data.description || "",
                    price: data.price?.toString() || "",
                    category: data.category || "Textbooks",
                    image: data.image || "",
                    status: data.status || "available",
                });
            } else {
                router.push('/store');
            }
        } catch (error) {
            console.error("Error fetching product:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        try {
            const res = await fetch(`/api/store/${product._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsEditing(false);
                fetchProduct();
            }
        } catch (error) {
            console.error("Update error:", error);
        }
    };

    const handleDelete = async () => {
        if (!product || !confirm("Are you sure you want to delete this product?")) return;

        try {
            const res = await fetch(`/api/store/${product._id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.push('/store');
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const handleBid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        try {
            const res = await fetch(`/api/store/${product._id}/bid`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bidData),
            });

            if (res.ok) {
                setShowBidForm(false);
                setBidData({ amount: "", message: "" });
                fetchProduct();
            }
        } catch (error) {
            console.error("Bid error:", error);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert("Product link copied to clipboard!");
    };

    const handleContactSeller = () => {
        if (product?.sellerId.email) {
            window.location.href = `mailto:${product.sellerId.email}?subject=Interested in ${product.title}`;
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!product) {
        return <div className="min-h-screen flex items-center justify-center">Product not found</div>;
    }

    const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'moderator';
    const isSeller = session?.user?.id === product.sellerId._id;
    const canEdit = isAdmin || isSeller;

    const statusColors = {
        available: 'bg-green-500/10 text-green-500 border-green-500/20',
        'in-bid': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        sold: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    const statusLabels = {
        available: 'Available',
        'in-bid': 'In Bid',
        sold: 'Sold',
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Back Button */}
                <Link href="/store" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={20} /> Back to Store
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Product Image & Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="relative h-96 bg-muted/50">
                                {product.image ? (
                                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                        <ShoppingBag size={80} className="opacity-20" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={handleShare}
                                        className="p-3 bg-background/80 backdrop-blur rounded-full hover:bg-background transition-colors"
                                    >
                                        <Share2 size={20} />
                                    </button>
                                    {canEdit && (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(!isEditing)}
                                                className="p-3 bg-background/80 backdrop-blur rounded-full hover:bg-background transition-colors"
                                            >
                                                <Edit size={20} />
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="p-3 bg-red-500/80 backdrop-blur rounded-full hover:bg-red-500 transition-colors text-white"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold border ${statusColors[product.status]}`}>
                                    {statusLabels[product.status]}
                                </div>
                            </div>

                            <div className="p-8">
                                {isEditing ? (
                                    <form onSubmit={handleUpdate} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Title</label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground">Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={formData.price}
                                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                    className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground">Category</label>
                                                <select
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none"
                                                >
                                                    <option>Textbooks</option>
                                                    <option>Electronics</option>
                                                    <option>Furniture</option>
                                                    <option>Clothing</option>
                                                    <option>Stationery</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none"
                                            >
                                                <option value="available">Available</option>
                                                <option value="in-bid">In Bid</option>
                                                <option value="sold">Sold</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Description</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none h-32 resize-none"
                                                required
                                            />
                                        </div>

                                        <ImageUpload
                                            value={formData.image}
                                            onChange={(url) => setFormData({ ...formData, image: url })}
                                            label="Product Image"
                                            folder="store-products"
                                        />

                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(false)}
                                                className="px-6 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <h1 className="text-4xl font-bold">{product.title}</h1>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-primary flex items-center gap-1">
                                                    <IndianRupee size={28} />
                                                    {product.price}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mb-6">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <Tag size={16} className="text-accent" />
                                                {product.category}
                                            </span>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="text-muted-foreground text-sm">
                                                Posted {new Date(product.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Seller</p>
                                            <p className="font-medium flex items-center gap-2">
                                                <User size={16} />
                                                {product.sellerId.name}
                                                {product.sellerId.role === 'admin' && 
                                                    <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">Admin</span>
                                                }
                                            </p>
                                        </div>

                                        <div className="prose prose-invert max-w-none">
                                            <h2 className="text-xl font-semibold mb-3">Description</h2>
                                            <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bids Section */}
                        {product.bids.length > 0 && (
                            <div className="glass-card p-6 rounded-2xl">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <MessageSquare size={20} className="text-secondary" />
                                    Bids ({product.bids.length})
                                    {(isAdmin || isSeller) && <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">{isAdmin ? 'Admin View' : 'Owner View'}</span>}
                                </h2>
                                <div className="space-y-4">
                                    {product.bids
                                        .sort((a, b) => b.amount - a.amount)
                                        .map((bid) => {
                                            const isOwnBid = session?.user?.id === bid.userId._id;
                                            const shouldShow = isAdmin || isSeller || isOwnBid;
                                            
                                            if (!shouldShow) return null;
                                            
                                            return (
                                                <div key={bid._id} className={`p-4 rounded-lg ${isOwnBid ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                                                                {bid.userId.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium flex items-center gap-2">
                                                                    {(isAdmin || isSeller) ? bid.userId.name : 'Your Bid'}
                                                                    {isOwnBid && <span className="text-xs px-2 py-0.5 bg-primary/30 text-primary rounded-full">Your Bid</span>}
                                                                </p>
                                                                {(isAdmin || isSeller) && (
                                                                    <>
                                                                        <p className="text-xs text-muted-foreground">{bid.userId.email}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {new Date(bid.createdAt).toLocaleString()}
                                                                        </p>
                                                                    </>
                                                                )}
                                                                {isOwnBid && !isAdmin && !isSeller && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {new Date(bid.createdAt).toLocaleString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-xl font-bold text-primary flex items-center gap-1">
                                                            <IndianRupee size={18} />
                                                            {bid.amount}
                                                        </p>
                                                    </div>
                                                    {bid.message && (
                                                        <p className="text-sm text-muted-foreground mt-2">{bid.message}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 rounded-2xl sticky top-24 space-y-4">
                            <h3 className="text-lg font-semibold">Actions</h3>
                            
                            {product.status !== 'sold' && !isSeller && session && (
                                <>
                                    {!showBidForm ? (
                                        <button
                                            onClick={() => setShowBidForm(true)}
                                            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg"
                                        >
                                            Place a Bid
                                        </button>
                                    ) : (
                                        <form onSubmit={handleBid} className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground">Your Offer (₹)</label>
                                                <input
                                                    type="number"
                                                    value={bidData.amount}
                                                    onChange={e => setBidData({ ...bidData, amount: e.target.value })}
                                                    className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none"
                                                    placeholder={`Base: ₹${product.price}`}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground">Message (optional)</label>
                                                <textarea
                                                    value={bidData.message}
                                                    onChange={e => setBidData({ ...bidData, message: e.target.value })}
                                                    className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none h-20 resize-none placeholder:text-muted-foreground"
                                                    placeholder="Add a message..."
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                                                >
                                                    Submit Bid
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowBidForm(false);
                                                        setBidData({ amount: "", message: "" });
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            )}

                            {!isSeller && session && (
                                <button
                                    onClick={handleContactSeller}
                                    className="w-full py-3 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary font-semibold hover:bg-secondary/20 transition-all"
                                >
                                    Message Seller
                                </button>
                            )}

                            {!session && (
                                <div className="text-center">
                                    <p className="text-muted-foreground text-sm mb-3">Sign in to place bids</p>
                                    <Link 
                                        href="/auth/signin" 
                                        className="block w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
                                    >
                                        Sign In
                                    </Link>
                                </div>
                            )}

                            {product.status === 'sold' && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                                    <p className="text-red-500 font-semibold">This item has been sold</p>
                                </div>
                            )}

                            {isSeller && (
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                                    <p className="text-blue-400 font-semibold">This is your listing</p>
                                </div>
                            )}
                            
                            {product.bids.length > 0 && !isAdmin && !isSeller && !product.bids.some((b: any) => b.userId._id === session?.user?.id) && (
                                <div className="p-4 bg-muted/30 rounded-lg text-center">
                                    <p className="text-muted-foreground text-sm">{product.bids.length} bid{product.bids.length !== 1 ? 's' : ''} placed</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
