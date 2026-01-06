"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, BookOpen, Heart, Globe, Github, Linkedin, Twitter, Instagram, Camera, Upload, Trash2, AlertTriangle } from "lucide-react";
import ConfirmationModal from "@/components/ConfirmationModal";
import { AVATARS, getAvatarById } from "@/lib/avatars";

interface UserProfile {
    name: string;
    email: string;
    role: string;
    avatar?: string;
    image?: string;
    bio?: string;
    courses?: string[];
    interests?: string[];
    socialLinks?: {
        linkedin?: string;
        github?: string;
        twitter?: string;
        instagram?: string;
    };
}

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        avatar: "boy1",
        image: "",
        bio: "",
        courses: "",
        interests: "",
        linkedin: "",
        github: "",
        twitter: "",
        instagram: "",

    });

    const [uploading, setUploading] = useState(false);

    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
            return;
        }

        if (status === "authenticated" && !isLoaded) {
            fetchProfile();
            setIsLoaded(true);
        }
    }, [status, router, isLoaded]);

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/profile");
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setFormData({
                    avatar: data.avatar || "boy1",
                    image: data.image || "",
                    bio: data.bio || "",
                    courses: data.courses?.join(", ") || "",
                    interests: data.interests?.join(", ") || "",
                    linkedin: data.socialLinks?.linkedin || "",
                    github: data.socialLinks?.github || "",
                    twitter: data.socialLinks?.twitter || "",
                    instagram: data.socialLinks?.instagram || "",
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    avatar: formData.avatar,
                    image: formData.image,
                    bio: formData.bio,
                    courses: formData.courses.split(",").map(s => s.trim()).filter(Boolean),
                    interests: formData.interests.split(",").map(s => s.trim()).filter(Boolean),
                    socialLinks: {
                        linkedin: formData.linkedin,
                        github: formData.github,
                        twitter: formData.twitter,
                        instagram: formData.instagram,
                    }
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                setIsEditing(false);

                // Update session with new avatar
                await update({
                    ...session,
                    user: {
                        ...session?.user,
                        avatar: updated.avatar,
                        image: updated.image // Ensure image is cleared if removed
                    }
                });
            }
        } catch (error) {
            console.error("Error saving profile:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append("file", file);
        data.append("folder", "profiles");

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
            });

            if (res.ok) {
                const { url } = await res.json();
                setFormData(prev => ({ ...prev, image: url }));

                // Update session immediately to reflect change in Navbar
                await update({
                    ...session,
                    user: {
                        ...session?.user,
                        image: url,
                    }
                });

            } else {
                console.error("Failed to upload image");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
        } finally {
            setUploading(false);
        }

    };

    const handleDeleteAccount = async () => {
        setDeleting(true);

        try {
            const res = await fetch("/api/profile", {
                method: "DELETE",
            });

            if (res.ok) {
                await signOut({ callbackUrl: '/' });
            } else {
                alert("Failed to delete account. Please try again.");
            }
        } catch (error) {
            console.error("Error deleting account:", error);
            alert("An error occurred.");
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Card */}
                <div className="glass-card p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 to-secondary/20 -z-10" />

                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-4 border-background flex items-center justify-center text-6xl shadow-xl relative group overflow-hidden">
                        {formData.image ? (
                            <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            getAvatarById(formData.avatar || 'boy1').emoji
                        )}

                        {isEditing && (
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                                {uploading ? (
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                ) : (
                                    <Camera className="text-white w-8 h-8" />
                                )}
                            </label>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold">{profile?.name}</h1>
                        <p className="text-muted-foreground">{profile?.email}</p>
                        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                            {profile?.role}
                        </span>
                    </div>

                    <button
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        {saving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Bio & Socials */}
                    <div className="space-y-8 md:col-span-1">
                        {/* Avatar Selection */}
                        {isEditing && (
                            <div className="glass-card p-6 rounded-2xl space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <User size={18} className="text-primary" /> Choose Avatar
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Boys</p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {AVATARS.male.map((avatar) => (
                                                <button
                                                    key={avatar.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, avatar: avatar.id, image: "" })}
                                                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-3xl transition-all ${formData.avatar === avatar.id && !formData.image
                                                        ? 'bg-primary/20 border-2 border-primary scale-110'
                                                        : 'bg-muted/30 hover:bg-muted/50 border border-border'
                                                        }`}
                                                    title={avatar.label}
                                                >
                                                    {avatar.emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Girls</p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {AVATARS.female.map((avatar) => (
                                                <button
                                                    key={avatar.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, avatar: avatar.id, image: "" })}
                                                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-3xl transition-all ${formData.avatar === avatar.id && !formData.image
                                                        ? 'bg-primary/20 border-2 border-primary scale-110'
                                                        : 'bg-muted/30 hover:bg-muted/50 border border-border'
                                                        }`}
                                                    title={avatar.label}
                                                >
                                                    {avatar.emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="glass-card p-6 rounded-2xl space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <User size={18} className="text-primary" /> About Me
                            </h3>
                            {isEditing ? (
                                <textarea
                                    className="w-full bg-input rounded-lg p-3 min-h-[100px] border border-border text-foreground focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground"
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Tell us about yourself..."
                                />
                            ) : (
                                <p className="text-muted-foreground leading-relaxed">
                                    {profile?.bio || "No bio yet."}
                                </p>
                            )}
                        </div>

                        <div className="glass-card p-6 rounded-2xl space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Globe size={18} className="text-accent" /> Socials
                            </h3>
                            <div className="space-y-3">
                                {isEditing ? (
                                    <>
                                        <input className="w-full bg-input p-2 rounded border border-border text-foreground text-sm placeholder:text-muted-foreground" placeholder="LinkedIn URL" value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} />
                                        <input className="w-full bg-input p-2 rounded border border-border text-foreground text-sm placeholder:text-muted-foreground" placeholder="GitHub URL" value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} />
                                        <input className="w-full bg-input p-2 rounded border border-border text-foreground text-sm placeholder:text-muted-foreground" placeholder="Twitter URL" value={formData.twitter} onChange={e => setFormData({ ...formData, twitter: e.target.value })} />
                                        <input className="w-full bg-input p-2 rounded border border-border text-foreground text-sm placeholder:text-muted-foreground" placeholder="Instagram URL" value={formData.instagram} onChange={e => setFormData({ ...formData, instagram: e.target.value })} />
                                    </>
                                ) : (
                                    <div className="flex gap-4 flex-wrap">
                                        {profile?.socialLinks?.linkedin && <a href={profile.socialLinks.linkedin} target="_blank" className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20"><Linkedin size={20} /></a>}
                                        {profile?.socialLinks?.github && <a href={profile.socialLinks.github} target="_blank" className="p-2 bg-gray-500/10 text-gray-400 rounded-lg hover:bg-gray-500/20"><Github size={20} /></a>}
                                        {profile?.socialLinks?.twitter && <a href={profile.socialLinks.twitter} target="_blank" className="p-2 bg-sky-500/10 text-sky-500 rounded-lg hover:bg-sky-500/20"><Twitter size={20} /></a>}
                                        {profile?.socialLinks?.instagram && <a href={profile.socialLinks.instagram} target="_blank" className="p-2 bg-pink-500/10 text-pink-500 rounded-lg hover:bg-pink-500/20"><Instagram size={20} /></a>}
                                        {!Object.values(profile?.socialLinks || {}).some(Boolean) && <p className="text-sm text-muted-foreground">No social links added.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Courses and Interests */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="glass-card p-6 rounded-2xl space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <BookOpen size={18} className="text-secondary" /> Courses
                            </h3>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Comma separated (e.g. CSE101, MTH302)</p>
                                    <input
                                        className="w-full bg-input rounded-lg p-3 border border-border text-foreground focus:ring-1 focus:ring-secondary outline-none placeholder:text-muted-foreground"
                                        value={formData.courses}
                                        onChange={(e) => setFormData({ ...formData, courses: e.target.value })}
                                        placeholder="CSE101, MTH302..."
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {profile?.courses && profile.courses.length > 0 ? (
                                        profile.courses.map((course, i) => (
                                            <span key={i} className="px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-sm">
                                                {course}
                                            </span>
                                        ))
                                    ) : <p className="text-muted-foreground">No courses listed.</p>}
                                </div>
                            )}
                        </div>

                        <div className="glass-card p-6 rounded-2xl space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Heart size={18} className="text-red-400" /> Interests & Hobbies
                            </h3>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Comma separated (e.g. Coding, Music, Football)</p>
                                    <input
                                        className="w-full bg-input rounded-lg p-3 border border-border text-foreground focus:ring-1 focus:ring-red-400 outline-none placeholder:text-muted-foreground"
                                        value={formData.interests}
                                        onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                                        placeholder="Coding, Music..."
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {profile?.interests && profile.interests.length > 0 ? (
                                        profile.interests.map((interest, i) => (
                                            <span key={i} className="px-3 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/20 text-sm">
                                                {interest}
                                            </span>
                                        ))
                                    ) : <p className="text-muted-foreground">No interests listed.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-red-500 mb-4">
                        <AlertTriangle size={20} /> Danger Zone
                    </h3>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">Delete Account</p>
                            <p className="text-sm text-muted-foreground">Permanently delete your account and all of your content.</p>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 border border-red-500/20"
                        >
                            <Trash2 size={16} />
                            {deleting ? "Deleting..." : "Delete Account"}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title="Delete Account?"
                description="This action cannot be undone. This will permanently delete your account and remove all your data from our servers."
                confirmLabel="Delete Account"
                variant="danger"
                isLoading={deleting}
            />
        </div>
    );
}
