import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const VoiceMessage = ({ url, isMine }) => {
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState("00:00");
    const [currentTime, setCurrentTime] = useState("00:00");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!waveformRef.current || !url) return;

        const waveColor = isMine ? "rgba(255, 255, 255, 0.5)" : "rgba(139, 149, 165, 0.5)"; // text-muted equivalent
        const progressColor = isMine ? "#ffffff" : "#3b82f6"; // accent for received, white for sent

        wavesurferRef.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: waveColor,
            progressColor: progressColor,
            cursorWidth: 0,
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            height: 30,
            url: url,
        });

        // Event listeners
        wavesurferRef.current.on("ready", () => {
            setIsLoaded(true);
            const totalSeconds = wavesurferRef.current.getDuration();
            setDuration(formatTime(totalSeconds));
        });

        wavesurferRef.current.on("audioprocess", () => {
            const currentSeconds = wavesurferRef.current.getCurrentTime();
            setCurrentTime(formatTime(currentSeconds));
        });

        wavesurferRef.current.on("finish", () => {
            setIsPlaying(false);
            setCurrentTime("00:00");
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
        <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
            <button
                onClick={togglePlayPause}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-fast ${isMine ? "bg-white/20 hover:bg-white/30 text-white" : "bg-accent/10 hover:bg-accent/20 text-accent"}`}
                disabled={!isLoaded}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>
            <div className="flex-1 flex flex-col justify-center overflow-hidden">
                <div ref={waveformRef} className="w-full relative">
                    {/* Overlay placeholder while loading if we wanted one */}
                    {!isLoaded && <div className="absolute inset-0 flex items-center"><div className="w-full h-[30px] opacity-20 bg-gradient-to-r from-transparent via-current to-transparent animate-pulse rounded"></div></div>}
                </div>
                <div className="flex justify-between items-center mt-1 w-full text-[10px] opacity-80" style={{ fontFamily: "monospace" }}>
                    <span>{isPlaying ? currentTime : duration}</span>
                </div>
            </div>
        </div>
    );
};

export default VoiceMessage;
