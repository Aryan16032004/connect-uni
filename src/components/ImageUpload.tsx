"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    folder?: string;
}

export default function ImageUpload({ value, onChange, label = "Upload Image", folder = "uploads" }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Please select an image file");
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError("File size must be less than 5MB");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Upload failed");
            }

            const data = await res.json();
            onChange(data.url);
        } catch (err) {
            setError("Failed to upload image. Please try again.");
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{label}</label>

            <div className="flex gap-2 items-start">
                <div className="flex-1">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full py-2.5 px-4 border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload size={18} />
                        {uploading ? "Uploading..." : "Choose Image"}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                {value && (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="p-2.5 border border-border rounded-lg hover:bg-red-500/10 hover:border-red-500/50 transition-colors text-red-500"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {value && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                </div>
            )}
        </div>
    );
}
