import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Send } from "lucide-react";

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

            mediaRecorder.start(200); // collect chunks every 200ms
            setIsRecording(true);

            // Start timer
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            onCancel(); // Auto cancel if mic access fails
        }
    };

    useEffect(() => {
        // Start recording immediately when mounted
        startRecording();
        return () => {
            stopRecording(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center flex-1 justify-between px-2 w-full animate-fade-in">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => { stopRecording(false); onCancel(); }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-fast"
                >
                    <Trash2 size={20} />
                </button>
                <div className="flex items-center gap-2 text-red-500 font-mono">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                    {formatTime(recordingTime)}
                </div>
            </div>

            <button
                type="button"
                onClick={() => { stopRecording(true); }}
                className="p-2.5 bg-accent text-white rounded-full hover:bg-accent-hover transition-fast shadow-md"
                style={{ backgroundColor: "var(--accent)" }}
            >
                <Send size={18} />
            </button>
        </div>
    );
};

export default VoiceRecorder;
