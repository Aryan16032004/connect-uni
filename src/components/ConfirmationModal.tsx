"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    variant?: "default" | "danger";
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isLoading = false,
    variant = "default",
}: ConfirmationModalProps) {

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl transform transition-all scale-100 p-6 space-y-6">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="space-y-2 text-center">
                    {variant === "danger" && (
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <AlertTriangle className="text-red-500" size={24} />
                        </div>
                    )}
                    <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
                    <p className="text-white text-sm leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2
                            ${variant === "danger"
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                                : "bg-primary hover:bg-primary/90 shadow-primary/20"
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
