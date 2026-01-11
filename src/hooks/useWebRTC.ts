import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/components/providers/SocketProvider";

const STUN_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

interface Peer {
    connection: RTCPeerConnection;
    stream?: MediaStream;
}

export const useWebRTC = (roomId: string, userStream: MediaStream | null) => {
    const { socket } = useSocket();
    const [peers, setPeers] = useState<Map<string, MediaStream>>(new Map()); // socketId -> Stream
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // socketId -> PC

    // Helper to create a peer connection
    const createPeer = useCallback((targetSocketId: string, initiator: boolean, stream: MediaStream) => {
        const pc = new RTCPeerConnection(STUN_SERVERS);

        // Add local tracks
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket?.emit("ice-candidate", {
                    target: targetSocketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle Remote Stream
        pc.ontrack = (event) => {
            console.log(`Received track from ${targetSocketId}`);
            setPeers(prev => {
                const newPeers = new Map(prev);
                newPeers.set(targetSocketId, event.streams[0]);
                return newPeers;
            });
        };

        // If initiator, create offer
        if (initiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    socket?.emit("offer", {
                        target: targetSocketId,
                        caller: socket.id,
                        sdp: pc.localDescription
                    });
                })
                .catch(err => console.error("Error creating offer:", err));
        }

        peersRef.current.set(targetSocketId, pc);
        return pc;
    }, [socket]);

    useEffect(() => {
        if (!socket || !userStream || !roomId) return;

        // 1. Join the voice room
        socket.emit("join-voice", roomId);

        // 2. Handle "all-users" -> Initiate connections
        const handleAllUsers = (users: string[]) => {
            console.log("Existing users in room:", users);
            users.forEach(userId => {
                createPeer(userId, true, userStream);
            });
        };

        // 3. Handle incoming OFFER (someone else joined and is calling me)
        const handleOffer = async (payload: { caller: string, sdp: any }) => {
            console.log("Received offer from:", payload.caller);
            let pc = peersRef.current.get(payload.caller);

            if (!pc) {
                // Create a non-initiator peer
                pc = createPeer(payload.caller, false, userStream);
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit("answer", {
                    target: payload.caller,
                    caller: socket.id,
                    sdp: pc.localDescription
                });
            } catch (err) {
                console.error("Error handling offer:", err);
            }
        };

        // 4. Handle incoming ANSWER (response to my offer)
        const handleAnswer = async (payload: { caller: string, sdp: any }) => {
            const pc = peersRef.current.get(payload.caller);
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                } catch (err) {
                    console.error("Error handling answer:", err);
                }
            }
        };

        // 5. Handle ICE Candidates
        const handleIceCandidate = async (payload: { sender: string, candidate: any }) => {
            const pc = peersRef.current.get(payload.sender);
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (err) {
                    console.error("Error adding ice candidate:", err);
                }
            }
        };

        // 6. Handle User Left
        const handleUserLeft = (socketId: string) => {
            console.log("User left:", socketId);
            if (peersRef.current.has(socketId)) {
                peersRef.current.get(socketId)?.close();
                peersRef.current.delete(socketId);
                setPeers(prev => {
                    const newPeers = new Map(prev);
                    newPeers.delete(socketId);
                    return newPeers;
                });
            }
        };

        socket.on("all-users", handleAllUsers);
        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("user-left", handleUserLeft);

        return () => {
            socket.off("all-users", handleAllUsers);
            socket.off("offer", handleOffer);
            socket.off("answer", handleAnswer);
            socket.off("ice-candidate", handleIceCandidate);
            socket.off("user-left", handleUserLeft);

            socket.emit("leave-voice", roomId);

            // Cleanup all connections
            peersRef.current.forEach(pc => pc.close());
            peersRef.current.clear();
        };

    }, [socket, roomId, userStream, createPeer]);

    return { peers };
};
