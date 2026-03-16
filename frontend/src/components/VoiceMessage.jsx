import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Mic } from "lucide-react";

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const VoiceMessage = ({ url, isMine }) => {
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!waveformRef.current || !url) return;

        const waveColor = isMine ? "rgba(255, 255, 255, 0.35)" : "rgba(100, 116, 139, 0.4)";
        const progressColor = isMine ? "#ffffff" : "var(--color-accent)";

        wavesurferRef.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor,
            progressColor,
            cursorWidth: 0,
            barWidth: 3,
            barGap: 2,
            barRadius: 3,
            height: 32,
            normalize: true,
            url,
        });

        wavesurferRef.current.on("ready", () => {
            setIsLoaded(true);
            setDuration(wavesurferRef.current.getDuration());
        });

        wavesurferRef.current.on("audioprocess", () => {
            setCurrentTime(wavesurferRef.current.getCurrentTime());
        });

        wavesurferRef.current.on("finish", () => {
            setIsPlaying(false);
            setCurrentTime(0);
            wavesurferRef.current.seekTo(0);
        });

        wavesurferRef.current.on("play", () => setIsPlaying(true));
        wavesurferRef.current.on("pause", () => setIsPlaying(false));

        return () => {
            wavesurferRef.current?.destroy();
        };
    }, [url, isMine]);

    const togglePlayPause = () => {
        if (!isLoaded) return;
        if (isPlaying) {
            wavesurferRef.current?.pause();
        } else {
            wavesurferRef.current?.play();
        }
    };

    return (
        <div className="flex items-center gap-3" style={{ minWidth: "220px", maxWidth: "320px" }}>
            {/* Play / Pause button with mic icon overlay */}
            <div className="relative shrink-0">
                <button
                    onClick={togglePlayPause}
                    disabled={!isLoaded}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                        isMine
                            ? "bg-white/20 text-white hover:bg-white/30"
                            : "bg-accent/15 text-accent hover:bg-accent/25"
                    }`}
                >
                    {isPlaying ? (
                        <Pause size={20} fill="currentColor" />
                    ) : (
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                    )}
                </button>
                {/* Small mic icon badge like WhatsApp */}
                <div
                    className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ${
                        isMine ? "bg-white/30 text-white" : "bg-accent/30 text-accent"
                    }`}
                >
                    <Mic size={9} />
                </div>
            </div>

            {/* Waveform + time */}
            <div className="flex flex-1 flex-col justify-center overflow-hidden">
                <div ref={waveformRef} className="relative w-full">
                    {!isLoaded && (
                        <div className="flex h-[32px] items-center gap-[3px] px-1">
                            {Array.from({ length: 28 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-[3px] rounded-full ${isMine ? "bg-white/20" : "bg-content-muted/20"}`}
                                    style={{ height: `${8 + Math.random() * 20}px` }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                    <span
                        className={`text-[11px] font-medium tabular-nums ${
                            isMine ? "text-white/60" : "text-content-muted"
                        }`}
                    >
                        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VoiceMessage;
