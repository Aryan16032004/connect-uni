"use client";

import ChatSidebar from "@/components/ChatSidebar";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-[calc(100vh-64px)] gap-4 p-4">
            <div className="w-80 hidden md:flex md:flex-col rounded-2xl overflow-hidden glass-card">
                <ChatSidebar />
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden glass-card">
                {children}
            </div>
        </div>
    );
}
