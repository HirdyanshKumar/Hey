import { useState } from "react";
import { X, Sparkles, Wand2, CheckCheck, Type, Briefcase, Coffee, GraduationCap, Loader2, Copy, Check } from "lucide-react";
import { rephraseTextAPI } from "../utils/api";
import toast from "react-hot-toast";

const modes = [
    { id: "rephrase", label: "Rephrase", icon: Wand2, description: "Say it differently" },
    { id: "grammar", label: "Grammar Fix", icon: CheckCheck, description: "Fix errors" },
    { id: "formal", label: "Formal", icon: GraduationCap, description: "Professional tone" },
    { id: "casual", label: "Casual", icon: Coffee, description: "Friendly tone" },
    { id: "professional", label: "Business", icon: Briefcase, description: "Business tone" },
];

const WritingToolsModal = ({ isOpen, onClose, onUseText, initialText = "" }) => {
    const [inputText, setInputText] = useState(initialText);
    const [result, setResult] = useState("");
    const [selectedMode, setSelectedMode] = useState("rephrase");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleProcess = async () => {
        if (!inputText.trim()) {
            toast.error("Please enter some text first");
            return;
        }

        setLoading(true);
        setResult("");
        try {
            const { data } = await rephraseTextAPI(inputText.trim(), selectedMode);
            setResult(data.result);
        } catch (err) {
            console.error("Rephrase failed:", err);
            toast.error("Failed to process text. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleUse = () => {
        if (result) {
            onUseText(result);
            onClose();
            setInputText("");
            setResult("");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        onClose();
        setInputText("");
        setResult("");
        setSelectedMode("rephrase");
    };

    return (
        <div className="writing-tools-overlay" onClick={handleClose}>
            <div className="writing-tools-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="writing-tools-header">
                    <div className="writing-tools-header-left">
                        <Sparkles size={20} className="writing-tools-icon" />
                        <h3>AI Writing Tools</h3>
                    </div>
                    <button className="writing-tools-close" onClick={handleClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="writing-tools-modes">
                    {modes.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <button
                                key={mode.id}
                                className={`writing-tools-mode-btn ${selectedMode === mode.id ? "active" : ""}`}
                                onClick={() => setSelectedMode(mode.id)}
                            >
                                <Icon size={14} />
                                <span>{mode.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Input */}
                <div className="writing-tools-input-section">
                    <label className="writing-tools-label">Your text</label>
                    <textarea
                        className="writing-tools-textarea"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type or paste the text you want to improve..."
                        rows={4}
                        maxLength={1000}
                    />
                    <span className="writing-tools-char-count">{inputText.length}/1000</span>
                </div>

                {/* Process Button */}
                <button
                    className="writing-tools-process-btn"
                    onClick={handleProcess}
                    disabled={loading || !inputText.trim()}
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            {modes.find(m => m.id === selectedMode)?.description || "Process"}
                        </>
                    )}
                </button>

                {/* Result */}
                {result && (
                    <div className="writing-tools-result">
                        <div className="writing-tools-result-header">
                            <label className="writing-tools-label">
                                <Sparkles size={12} /> AI Result
                            </label>
                            <button className="writing-tools-copy-btn" onClick={handleCopy}>
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                        <div className="writing-tools-result-text">{result}</div>
                        <button className="writing-tools-use-btn" onClick={handleUse}>
                            <Type size={16} />
                            Use This Text
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WritingToolsModal;
