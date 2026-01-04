'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { useSession } from 'next-auth/react';
import { Loader2, Navigation, Flame, Heart, Skull, BookOpen, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
    interface Window {
        google: any;
    }
}

const VIBES = [
    { id: 'best', label: 'Lit', emoji: '🔥', color: '#EF4444' },
    { id: 'couple', label: 'Romantic', emoji: '💕', color: '#EC4899' },
    { id: 'worst', label: 'Eww', emoji: '🤮', color: '#A16207' },
    { id: 'study', label: 'Focus', emoji: '📚', color: '#3B82F6' },
    { id: 'boring', label: 'Dead', emoji: '😴', color: '#6B7280' },
];

export default function CampusMap() {
    const { data: session } = useSession();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const heatmapLayerRef = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
    const [tagText, setTagText] = useState('');
    const [showTagModal, setShowTagModal] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        if (window.google && window.google.maps) {
            setScriptLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log(`User location obtained: lat ${position.coords.latitude}, lng ${position.coords.longitude}`);
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error('Error getting location', error);
                    setLoading(false);
                }
            );
        } else {
            setLoading(false);
        }
    }, []);

    const refreshMapData = async () => {
        if (!mapInstanceRef.current || !window.google) return;
        const map = mapInstanceRef.current;

        console.log("Refreshing map data...");

        // 1. Refresh Heatmap
        try {
            const heatmapRes = await fetch('/api/heatmap');
            const heatmapData = await heatmapRes.json();

            if (heatmapLayerRef.current) {
                heatmapLayerRef.current.setMap(null);
            }

            if (heatmapData.success && heatmapData.data.length > 0) {
                console.log(`Heatmap points: ${heatmapData.data.length}`);
                const heatmapPoints = heatmapData.data.map((p: any) =>
                    new window.google.maps.LatLng(p.lat, p.lng)
                );

                console.log(`Creating heatmap with ${heatmapPoints.length} points`);
                if (window.google.maps.visualization) {
                    const heatmap = new window.google.maps.visualization.HeatmapLayer({
                        data: heatmapPoints,
                        map: map,
                        radius: 40,
                        opacity: 0.6,
                    });
                    heatmapLayerRef.current = heatmap;
                }
            }
        } catch (e) { console.error("Heatmap refresh error", e); }

        // 2. Refresh Verified Tags
        try {
            const tagsRes = await fetch('/api/verified-tags');
            const tagsData = await tagsRes.json();

            // Clear existing markers
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];

            if (tagsData.success && Array.isArray(tagsData.data)) {
                console.log(`Verified tags found: ${tagsData.data.length}`);

                tagsData.data.forEach((tag: any) => {
                    const vibe = VIBES.find(v => v.id === tag.type) || VIBES[0];

                    console.log(`Adding marker for tag: ${tag.text}`);
                    // DEBUG: Using standard marker to verify visibility
                    const marker = new window.google.maps.Marker({
                        position: { lat: tag.lat, lng: tag.lng },
                        map: map,
                        title: tag.text,
                        label: {
                            text: `${vibe.emoji} ${tag.text}`,
                            color: 'black', // Standard label color
                            fontWeight: 'bold',
                            fontSize: '14px',
                        }
                        // Removed custom icon for debugging
                    });

                    const infoWindow = new window.google.maps.InfoWindow({
                        content: `
                  <div style="color:black; padding:5px;">
                    <strong style="color:${vibe.color}; font-size:16px;">${vibe.emoji} ${vibe.label}</strong><br/>
                    <div style="margin-top:4px; font-size:14px;">"${tag.text}"</div>
                    <div style="color:#666; font-size:11px; margin-top:4px;">Verified by ${tag.count} people</div>
                  </div>`
                    });

                    marker.addListener("click", () => {
                        infoWindow.open(map, marker);
                    });

                    markersRef.current.push(marker);
                });
            }
        } catch (e) { console.error("Tags refresh error", e); }
    };

    const initMap = useCallback(async () => {
        if (!mapRef.current || !userLocation || !window.google || mapInstanceRef.current) return;

        try {
            const map = new window.google.maps.Map(mapRef.current, {
                center: userLocation,
                zoom: 18,
                mapTypeId: 'roadmap',
                disableDefaultUI: false,
            });

            mapInstanceRef.current = map;

            // Initial Data Fetch
            await refreshMapData();

        } catch (e) {
            console.error("Map init failed", e);
        } finally {
            setLoading(false);
        }
    }, [userLocation]);

    useEffect(() => {
        if (scriptLoaded && userLocation) {
            initMap();
        }
    }, [scriptLoaded, userLocation, initMap]);

    const handleVibeClick = (vibeId: string) => {
        setSelectedVibe(vibeId);
        setShowTagModal(true);
    };

    const verifyAndSubmit = async () => {
        if (!userLocation || !session || !selectedVibe) return;
        setSubmitting(true);

        try {
            console.log(`Submitting vibe: type ${selectedVibe}, text ${tagText}`);
            const res = await fetch('/api/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                    tagType: selectedVibe,
                    tagText: tagText.trim()
                }),
            });

            if (res.ok) {
                console.log("Vibe dropped successfully");
                setTagText('');
                setShowTagModal(false);
                setSelectedVibe(null);
                await refreshMapData();
            } else {
                alert('Failed to drop vibe.');
            }
        } catch (e) {
            alert('Error.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        return <div className="text-white p-4">Error: API Key missing.</div>;
    }

    return (
        <div className="relative w-full h-[calc(100vh-64px)] bg-black overflow-hidden">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=visualization`}
                strategy="afterInteractive"
                onReady={() => setScriptLoaded(true)}
                onError={() => {
                    console.warn("Google Maps API failed to load. Please enable billing in Google Cloud Console.");
                }}
            />

            <div ref={mapRef} className="w-full h-full opacity-90" />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                </div>
            )}

            {/* Recenter */}
            <button
                onClick={() => {
                    if (mapInstanceRef.current && userLocation) {
                        mapInstanceRef.current.panTo(userLocation);
                        mapInstanceRef.current.setZoom(18);
                    }
                }}
                className="absolute bottom-32 right-6 bg-white/10 backdrop-blur-md p-3 rounded-full text-white border border-white/20 shadow-xl z-10"
            >
                <Navigation className="w-6 h-6" />
            </button>

            {/* Emoji Bar */}
            <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-4">
                <div className="flex gap-3 bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl overflow-x-auto">
                    {VIBES.map((vibe) => (
                        <motion.button
                            key={vibe.id}
                            whileHover={{ scale: 1.1, y: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleVibeClick(vibe.id)}
                            className="flex flex-col items-center gap-1 min-w-[60px]"
                        >
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg border border-white/10"
                                style={{ backgroundColor: vibe.color }}
                            >
                                {vibe.emoji}
                            </div>
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{vibe.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showTagModal && selectedVibe && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowTagModal(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative"
                        >
                            <div className="relative z-10 text-center">
                                <div
                                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-4xl mb-4 shadow-xl border-4 border-zinc-900"
                                    style={{ backgroundColor: VIBES.find(v => v.id === selectedVibe)?.color }}
                                >
                                    {VIBES.find(v => v.id === selectedVibe)?.emoji}
                                </div>

                                <h3 className="text-2xl font-black text-white mb-1">
                                    {VIBES.find(v => v.id === selectedVibe)?.label} Check
                                </h3>
                                <p className="text-zinc-500 text-sm mb-6">What's the vibe here?</p>

                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Describe the vibe..."
                                    className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-lg mb-4 text-center"
                                    value={tagText}
                                    onChange={(e) => setTagText(e.target.value)}
                                />

                                <button
                                    onClick={verifyAndSubmit}
                                    disabled={submitting || !tagText.trim()}
                                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Drop Vibe'}
                                </button>

                                <button
                                    onClick={() => setShowTagModal(false)}
                                    className="mt-4 text-zinc-500 text-sm hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
