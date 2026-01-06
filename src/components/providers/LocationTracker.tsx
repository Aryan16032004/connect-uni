"use client";

import { useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export default function LocationTracker() {
    const { status } = useSession();

    const updateLocation = useCallback(async (lat: number, lng: number) => {
        try {
            await fetch("/api/location/heartbeat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat, lng }),
            });
        } catch (error) {
            console.error("Failed to update location", error);
        }
    }, []);

    useEffect(() => {
        // Only track if authenticated
        if (status !== "authenticated" || !navigator.geolocation) return;

        console.log("Starting location tracking...");

        // Watch position for real-time updates
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // De-bouncing logic could go here, but for now we rely on browser's watchPosition implementation
                // and maybe server-side throttling if needed. 
                // Let's implement a simple client-side throttle to avoid flooding locally if the browser fires too often.
                // Actually, for a "watch", simple distinct checks are good.

                // We'll trust the browser's "significant change" or standard interval for now, 
                // but let's just send it.
                updateLocation(latitude, longitude);
            },
            (error) => {
                console.warn("Location tracking error:", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
                // maximumAge: 0 forces a fresh reading. 
                // If we wanted to throttle, we could wrap updateLocation in a throttle function.
            }
        );

        return () => {
            console.log("Stopping location tracking...");
            navigator.geolocation.clearWatch(watchId);
        };
    }, [status, updateLocation]);

    useEffect(() => {
        // Cleanup on unmount/reload
        const handleUnload = () => {
            if (navigator.sendBeacon) {
                // Use sendBeacon for reliable delivery during unload
                navigator.sendBeacon("/api/location/heartbeat");
            } else {
                // Fallback for older browsers
                fetch("/api/location/heartbeat", { method: "DELETE", keepalive: true });
            }
        };

        window.addEventListener("beforeunload", handleUnload);

        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            // Also trigger on component unmount (e.g. navigation)
            fetch("/api/location/heartbeat", { method: "DELETE", keepalive: true });
        };
    }, []);

    return null; // This component handles logic only, no UI
}
