import { useState } from "react";
import { X, Sparkles, Wand2, CheckCheck, Type, Briefcase, Coffee, GraduationCap, Loader2, Copy, Check } from "lucide-react";
import { rephraseTextAPI } from "../utils/api";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const modes = [
    { id: "rephrase", label: "Rephrase", icon: Wand2, description: "Say it differently" },
    { id: "grammar", label: "Grammar Fix", icon: CheckCheck, description: "Fix errors" },
    { id: "formal", label: "Formal", icon: GraduationCap, description: "Professional" },
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
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" 
            onClick={handleClose}
        >
            <div 
                className="flex w-full max-w-[500px] flex-col overflow-hidden rounded-[28px] border border-border bg-surface-panel shadow-elevated" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                            <Sparkles size={18} className="text-accent" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-content-primary">AI Writing Tools</h3>
                    </div>
                    <button 
                        className="rounded-full bg-surface-secondary p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary" 
                        onClick={handleClose}
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex flex-col gap-6 p-6 sm:px-8 sm:py-6">
                    {/* Mode Selector */}
                    <div className="flex flex-wrap gap-2">
                        {modes.map((mode) => {
                            const Icon = mode.icon;
                            const isSelected = selectedMode === mode.id;
                            return (
                                <button
                                    key={mode.id}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium transition-colors",
                                        isSelected 
                                            ? "border-accent bg-accent text-white shadow-sm" 
                                            : "bg-surface-elevated text-content-secondary hover:border-accent/40 hover:bg-surface-hover hover:text-content-primary"
                                    )}
                                    onClick={() => setSelectedMode(mode.id)}
                                >
                                    <Icon size={14} />
                                    <span>{mode.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Input */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-content-muted">Your text</label>
                        <div className="relative">
                            <textarea
                                className="w-full resize-none rounded-2xl border border-border bg-surface-bg p-4 text-sm text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-accent"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Type or paste the text you want to improve..."
                                rows={4}
                                maxLength={1000}
                            />
                            <span className="absolute bottom-3 right-4 text-xs text-content-muted">
                                {inputText.length}/1000
                            </span>
                        </div>
                    </div>

                    {/* Process Button */}
                    <Button
                        className="w-full h-11 rounded-xl shadow-sm text-sm font-semibold flex items-center justify-center gap-2"
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
                    </Button>

                    {/* Result */}
                    {result && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                                    <Sparkles size={12} /> AI Result
                                </label>
                                <button 
                                    className="flex items-center gap-1.5 text-xs font-medium text-content-secondary hover:text-content-primary transition-colors" 
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
                                    {copied ? <span className="text-status-success">Copied</span> : "Copy"}
                                </button>
                            </div>
                            
                            <div className="text-sm leading-relaxed text-content-primary whitespace-pre-wrap rounded-xl bg-surface-panel p-3 border border-border/50">
                                {result}
                            </div>
                            
                            <Button 
                                variant="outline" 
                                className="mt-1 w-full flex items-center justify-center gap-2 border-accent/30 hover:bg-accent/10 hover:text-accent" 
                                onClick={handleUse}
                            >
                                <Type size={16} />
                                Use This Text
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WritingToolsModal;
