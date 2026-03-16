import { useState, useRef, useEffect } from "react";
import { Trash2, Send, Mic } from "lucide-react";

const VoiceRecorder = ({ onSend, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const stopRecording = (send = false) => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });

                // Stop all tracks to release mic
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

                if (send) {
                    onSend(file);
                }
            };

            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(200);
            setIsRecording(true);

            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            onCancel();
        }
    };

    useEffect(() => {
        startRecording();
        return () => {
            stopRecording(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex flex-1 items-center gap-3 animate-fade-in">
            {/* Delete / Cancel button */}
            <button
                type="button"
                onClick={() => { stopRecording(false); onCancel(); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-status-error transition-colors hover:bg-status-error/15"
            >
                <Trash2 size={20} />
            </button>

            {/* Recording indicator */}
            <div className="flex flex-1 items-center gap-3 rounded-full bg-surface-elevated px-4 py-2.5">
                {/* Pulsing red dot */}
                <div className="relative flex h-3 w-3 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-error opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-status-error" />
                </div>

                {/* Timer */}
                <span className="font-mono text-sm font-medium tabular-nums text-content-primary">
                    {formatTime(recordingTime)}
                </span>

                {/* Animated waveform bars */}
                <div className="flex flex-1 items-center justify-center gap-[3px]">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-[3px] rounded-full bg-accent/60"
                            style={{
                                height: `${6 + Math.sin((recordingTime * 3 + i) * 0.7) * 10 + Math.random() * 6}px`,
                                transition: "height 0.15s ease",
                            }}
                        />
                    ))}
                </div>

                <Mic size={16} className="shrink-0 text-status-error" />
            </div>

            {/* Send button */}
            <button
                type="button"
                onClick={() => { stopRecording(true); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-md transition-colors hover:bg-accent-hover"
            >
                <Send size={18} />
            </button>
        </div>
    );
};

export default VoiceRecorder;
