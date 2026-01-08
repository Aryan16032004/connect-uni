"use client";

import { useState } from "react";
import { Mic, MicOff, PhoneOff, User } from "lucide-react";

export default function VoiceRoom({ channelId }: { channelId: string }) {
    const [micOn, setMicOn] = useState(true);
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-white bg-slate-950">
            <div className="text-2xl font-bold mb-4">Voice Channel (deprecated): {channelId.slice(-4)}</div>
            <div className="flex flex-wrap gap-6 justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center border-4 border-slate-800 shadow-xl relative">
                        <User size={40} />
                        {!micOn && (
                            <div className="absolute bottom-0 right-0 bg-red-500 rounded-full p-1 border-2 border-slate-900">
                                <MicOff size={14} />
                            </div>
                        )}
                    </div>
                    <span className="font-semibold">You</span>
                </div>
            </div>
            <div className="fixed bottom-8 flex items-center gap-4 bg-slate-900 p-4 rounded-full shadow-2xl border border-slate-800">
                <button onClick={() => setMicOn((v) => !v)} className={`p-4 rounded-full transition-colors ${micOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"}`}>
                    {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button onClick={() => window.history.back()} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors">
                    <PhoneOff size={24} />
                </button>
            </div>
        </div>
    );
}
