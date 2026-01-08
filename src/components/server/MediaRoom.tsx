"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, User } from "lucide-react";
import { useSession } from "next-auth/react";

import { useSocket } from "@/components/providers/SocketProvider";

interface MediaRoomProps {
    channelId: string;
    video?: boolean;
}

type PeerStream = {
    stream: MediaStream;
    userId?: string;
};

const pcConfig: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(process.env.NEXT_PUBLIC_TURN_URL && process.env.NEXT_PUBLIC_TURN_USERNAME && process.env.NEXT_PUBLIC_TURN_PASSWORD
            ? [
                {
                    urls: process.env.NEXT_PUBLIC_TURN_URL,
                    username: process.env.NEXT_PUBLIC_TURN_USERNAME,
                    credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
                } as RTCIceServer,
            ]
            : []),
    ],
};

export default function MediaRoom({ channelId, video = false }: MediaRoomProps) {
    return (
        <div className="h-full w-full flex flex-col bg-slate-950 text-white">
            <MediaControlPanel channelId={channelId} video={video} />
        </div>
    );
}

function MediaControlPanel({ channelId, video = false }: MediaRoomProps) {
    const { socket, isConnected } = useSocket();
    const { data: session } = useSession();

    const [micOn, setMicOn] = useState<boolean>(true);
    const [cameraOn, setCameraOn] = useState<boolean>(!!video);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, PeerStream>>({});

    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const signalingQueueRef = useRef<Map<string, Promise<void>>>(new Map());
    const makingOfferRef = useRef<Map<string, boolean>>(new Map());

    // Acquire media once connected
    useEffect(() => {
        if (!socket) return;
        let cancelled = false;

        const startMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video,
                });
                if (cancelled) return;
                setLocalStream(stream);
                setCameraOn(video);
                // Default track enabled states
                stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
                stream.getVideoTracks().forEach((t) => (t.enabled = video && cameraOn));
            } catch (err) {
                console.error("Failed to start media", err);
            }
        };

        startMedia();

        return () => {
            cancelled = true;
            setLocalStream((prev) => {
                prev?.getTracks().forEach((t) => t.stop());
                return null;
            });
        };
    }, [socket, video]);

    // Toggle track states when mic/camera change
    useEffect(() => {
        if (!localStream) return;
        localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
    }, [micOn, localStream]);

    useEffect(() => {
        if (!localStream) return;
        localStream.getVideoTracks().forEach((t) => (t.enabled = cameraOn && video));
    }, [cameraOn, localStream, video]);

    // WebRTC + signaling wiring
    useEffect(() => {
        if (!socket || !localStream) return;

        // Join existing socket rooms used by chat as well
        console.log("[WEBRTC] join-room", { roomId: channelId, socketId: socket.id });
        socket.emit("join-room", channelId);
        console.log("[WEBRTC] webrtc:join emit", { roomId: channelId, userId: session?.user?.id, socketId: socket.id });
        socket.emit("webrtc:join", { roomId: channelId, userId: session?.user?.id });

        const handlePeers = (payload: { peers: { socketId: string; userId?: string }[] }) => {
            console.log("[WEBRTC] webrtc:peers received", payload.peers);
            // I am the new joiner, so I will initiate offers to all existing peers
            payload.peers.forEach(async ({ socketId, userId }) => {
                const pc = createPeerConnection(socketId, userId);
                if (!pc) return;
                console.log("[WEBRTC] negotiateOffer to existing peer", { to: socketId });
                await negotiateOffer(pc, socketId);
            });
        };

        const handlePeerJoined = async ({ socketId, userId }: { socketId: string; userId?: string }) => {
            console.log("[WEBRTC] webrtc:peer-joined", { socketId, userId, me: socket?.id });
            // Track presence
            setRemoteStreams((prev) => {
                if (prev[socketId]) return prev;
                return { ...prev, [socketId]: { stream: new MediaStream(), userId } };
            });

            // Create PC
            const pc = createPeerConnection(socketId, userId);

            // Backup initiation: If I am "Impolite" (socket.id > socketId), and I haven't offered yet, I should offer.
            // This covers cases where `webrtc:peers` wasn't received by the other side, or general mesh convergence.
            // But we must be careful not to double offer if `peers` already triggered it.
            // Usually `peers` is for the NEW joiner. `peer-joined` is for EXISTING.
            // If I am EXISTING, I usually wait.
            // But if the Joiner fails to offer (e.g. they are behind a strict firewall or logic bug), we want to try.
            // Let's use the standard "Polite Peer" tie-break.
            // We are IMPOLITE if our ID is larger (arbitrary convention, just needs to be consistent).
            if (socket?.id && socket.id > socketId) {
                console.log("[WEBRTC] peer-joined: I am Impolite, acting as backup initiator", { to: socketId });
                await negotiateOffer(pc, socketId);
            }
        };

        const handlePeerLeft = ({ socketId }: { socketId: string }) => {
            console.log("[WEBRTC] webrtc:peer-left", { socketId });
            closePeer(socketId);
            setRemoteStreams((prev) => {
                const next = { ...prev };
                delete next[socketId];
                return next;
            });
        };

        const processPendingCandidates = async (pc: RTCPeerConnection, peerId: string) => {
            const candidates = pendingCandidatesRef.current.get(peerId) || [];
            if (candidates.length === 0) return;

            console.log("[WEBRTC] flushing pending candidates", { peerId, count: candidates.length });
            for (const candidate of candidates) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Failed to add delayed ICE candidate", err);
                }
            }
            pendingCandidatesRef.current.delete(peerId);
        };

        const handleSignal = async ({
            from,
            type,
            description,
            candidate,
            userId,
        }: {
            from: string;
            type: "offer" | "answer" | "ice-candidate";
            description?: RTCSessionDescriptionInit;
            candidate?: RTCIceCandidateInit;
            userId?: string;
        }) => {
            console.log("[WEBRTC] webrtc:signal received", { from, type, hasDesc: !!description, hasCand: !!candidate });
            let pc = peersRef.current.get(from);
            if (!pc) {
                pc = createPeerConnection(from, userId);
            }
            if (!pc) return;

            // Strict Politeness:
            // If my ID is smaller, I am POLITE. (I yield).
            // If my ID is larger, I am IMPOLITE. (I win).
            const polite = socket?.id && socket.id < from;

            // Queue signaling to prevent race conditions
            const currentQueue = signalingQueueRef.current.get(from) || Promise.resolve();
            const newQueue = currentQueue
                .then(async () => {
                    if (type === "offer" && description) {
                        console.log("[WEBRTC] handling offer", { from, polite });

                        // Collision detection (Perfect Negotiation Pattern)
                        const isMakingOffer = makingOfferRef.current.get(from) || false;
                        const offerCollision = (description.type === "offer") &&
                            (isMakingOffer || pc.signalingState !== "stable");

                        if (offerCollision && !polite) {
                            console.log("[WEBRTC] ignoring offer collision (I am impolite)", { from });
                            return; // Ignore
                        }

                        if (offerCollision && polite) {
                            console.log("[WEBRTC] rolling back offer (I am polite)", { from });
                            await Promise.all([
                                pc.setLocalDescription({ type: "rollback" }),
                                pc.setRemoteDescription(description)
                            ]);
                        } else {
                            // Normal case
                            await pc.setRemoteDescription(description);
                        }

                        await addLocalTracks(pc);
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit("webrtc:signal", {
                            to: from,
                            type: "answer",
                            description: answer,
                            userId: session?.user?.id,
                        });
                        await processPendingCandidates(pc, from);

                    } else if (type === "answer" && description) {
                        console.log("[WEBRTC] handling answer", { from });
                        await pc.setRemoteDescription(description);
                        await processPendingCandidates(pc, from);

                    } else if (type === "ice-candidate" && candidate) {
                        if (pc.remoteDescription) {
                            try {
                                // console.log("[WEBRTC] adding ICE candidate", { from });
                                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (err) {
                                console.error("ICE candidate add failed", err);
                            }
                        } else {
                            console.log("[WEBRTC] queuing ICE candidate (no remote desc)", { from });
                            const list = pendingCandidatesRef.current.get(from) || [];
                            list.push(candidate);
                            pendingCandidatesRef.current.set(from, list);
                        }
                    }
                })
                .catch((err) => console.error("[WEBRTC] signaling error", { from, type, err }));

            signalingQueueRef.current.set(from, newQueue);
        };

        socket.on("webrtc:peers", handlePeers);
        socket.on("webrtc:peer-joined", handlePeerJoined);
        socket.on("webrtc:peer-left", handlePeerLeft);
        socket.on("webrtc:signal", handleSignal);

        return () => {
            socket.emit("webrtc:leave", { roomId: channelId });
            socket.off("webrtc:peers", handlePeers);
            socket.off("webrtc:peer-joined", handlePeerJoined);
            socket.off("webrtc:peer-left", handlePeerLeft);
            socket.off("webrtc:signal", handleSignal);
            peersRef.current.forEach((pc, peerId) => {
                pc.close();
                peersRef.current.delete(peerId);
            });
            pendingCandidatesRef.current.clear();
        };
    }, [socket, localStream, channelId, session?.user?.id]);

    const addLocalTracks = async (pc: RTCPeerConnection) => {
        if (!localStream) return;
        const senders = pc.getSenders();
        localStream.getTracks().forEach((track) => {
            console.log("[WEBRTC] addLocalTracks", { kind: track.kind });
            const alreadySent = senders.find((s) => s.track?.kind === track.kind);
            if (!alreadySent) pc.addTrack(track, localStream);
        });
    };

    const createPeerConnection = (peerId: string, userId?: string) => {
        if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;
        const pc = new RTCPeerConnection(pcConfig);
        console.log("[WEBRTC] createPeerConnection", { peerId, userId });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("[WEBRTC] onicecandidate", { to: peerId });
                socket?.emit("webrtc:signal", {
                    to: peerId,
                    type: "ice-candidate",
                    candidate: event.candidate,
                    userId: session?.user?.id,
                });
            }
        };

        pc.ontrack = (event) => {
            console.log("[WEBRTC] ontrack", { peerId, streams: event.streams.length });
            setRemoteStreams((prev) => ({
                ...prev,
                [peerId]: {
                    stream: event.streams[0],
                    userId,
                },
            }));
        };

        pc.onconnectionstatechange = () => {
            console.log("[WEBRTC] pc.connectionState", { peerId, state: pc.connectionState });
        };
        pc.oniceconnectionstatechange = () => {
            console.log("[WEBRTC] pc.iceConnectionState", { peerId, state: pc.iceConnectionState });
        };

        addLocalTracks(pc);
        peersRef.current.set(peerId, pc);
        return pc;
    };

    const negotiateOffer = async (pc: RTCPeerConnection, peerId: string) => {
        console.log("[WEBRTC] negotiateOffer", { to: peerId });
        makingOfferRef.current.set(peerId, true);
        try {
            await addLocalTracks(pc);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit("webrtc:signal", {
                to: peerId,
                type: "offer",
                description: offer,
                userId: session?.user?.id,
            });
        } catch (err) {
            console.error("negotiateOffer failed", err);
        } finally {
            // We keep makingOffer true until we get an answer? 
            // Strictly speaking in Perfect Negotiation "makingOffer" handles the duration of generating the offer.
            // But simpler logic:
            makingOfferRef.current.set(peerId, false);
        }
    };

    const closePeer = (peerId: string) => {
        const pc = peersRef.current.get(peerId);
        if (pc) {
            pc.close();
            peersRef.current.delete(peerId);
        }
        pendingCandidatesRef.current.delete(peerId);
        makingOfferRef.current.delete(peerId);
    };

    const leaveChannel = () => {
        socket?.emit("webrtc:leave", { roomId: channelId });
        window.history.back();
    };

    const allTiles: { id: string; label: string; stream: MediaStream | null; showVideo: boolean; isLocal: boolean }[] = useMemo(() => {
        const tiles = [
            {
                id: "local",
                label: session?.user?.name || "You",
                stream: localStream,
                showVideo: video && cameraOn,
                isLocal: true,
            },
        ];
        Object.entries(remoteStreams).forEach(([peerId, data]) => {
            tiles.push({
                id: peerId,
                label: data.userId ? `User ${data.userId}` : `Peer ${peerId.slice(-4)}`,
                stream: data.stream,
                showVideo: video,
                isLocal: false,
            });
        });
        return tiles;
    }, [localStream, remoteStreams, cameraOn, video, session?.user?.name]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
            <div className="text-xl font-semibold text-slate-200">{video ? "Video" : "Voice"} Channel (WebRTC)</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
                {allTiles.map((tile) => (
                    <MediaTile key={tile.id} label={tile.label} stream={tile.stream} showVideo={tile.showVideo} video={video} isLocal={tile.isLocal} />
                ))}
            </div>

            <div className="mt-2 text-slate-400 text-sm">
                {isConnected ? "Signaling connected" : "Connecting to signaling..."} • Peers: {Math.max(0, Object.keys(remoteStreams).length)}
            </div>

            <div className="h-20 flex items-center justify-center gap-6">
                <button
                    onClick={() => setMicOn((v) => !v)}
                    className={`p-4 rounded-full transition-colors shadow-lg ${micOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"}`}
                    title="Toggle Mic"
                >
                    {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                {video && (
                    <button
                        onClick={() => setCameraOn((v) => !v)}
                        className={`p-4 rounded-full transition-colors shadow-lg ${cameraOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"}`}
                        title="Toggle Camera"
                    >
                        {cameraOn ? <Camera size={24} /> : <CameraOff size={24} />}
                    </button>
                )}
                <button
                    onClick={leaveChannel}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors shadow-lg"
                    title="Leave Call"
                >
                    <PhoneOff size={24} />
                </button>
            </div>
        </div>
    );
}

interface MediaTileProps {
    label: string;
    stream: MediaStream | null;
    showVideo: boolean;
    video: boolean;
    isLocal: boolean;
}

function MediaTile({ label, stream, showVideo, video, isLocal }: MediaTileProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
            // Attempt to play in case autoplay is blocked
            audioRef.current.play().catch(() => { });
        }
    }, [stream]);

    return (
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg aspect-video flex items-center justify-center">
            {video && showVideo && stream ? (
                <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover bg-black" />
            ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-200">
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                        <User size={28} />
                    </div>
                    <span className="text-sm font-semibold">{label}</span>
                </div>
            )}
            {stream && (
                <audio ref={audioRef} autoPlay playsInline muted={isLocal} className="hidden" />
            )}
        </div>
    );
}
