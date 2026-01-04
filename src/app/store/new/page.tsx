"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/ImageUpload";

export default function AddProductPage() {
    const router = useRouter();
    const { status } = useSession();
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        category: "Textbooks",
        image: "", // We'll keep image as string URL for MVP (maybe placeholder or external link)
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (status === "unauthenticated") {
        router.push("/auth/signin");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/store", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error("Failed to create product");
            }

            router.push("/store");
            router.refresh();
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
            <div className="glass-card w-full max-w-2xl p-6 md:p-8 rounded-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/store" className="p-2 rounded-full hover:bg-muted transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">List Item for Sale</h1>
                        <p className="text-muted-foreground text-sm">Fill in the details below</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded">{error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none placeholder:text-muted-foreground"
                                placeholder="Calculus Textbook"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Price (₹)</label>
                            <input
                                type="number"
                                required
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none placeholder:text-muted-foreground"
                                placeholder="500"
                            />
                        </div>
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

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-input border border-border rounded-lg p-2.5 text-foreground focus:border-primary outline-none h-32 resize-none placeholder:text-muted-foreground"
                            placeholder="Condition, details, meetup preference..."
                        />
                    </div>

                    <ImageUpload
                        value={formData.image}
                        onChange={(url) => setFormData({ ...formData, image: url })}
                        label="Product Image (Optional)"
                        folder="store-products"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg"
                    >
                        {loading ? "Listing Item..." : "List Item"}
                    </button>
                </form>
            </div>
        </div>
    );
}
