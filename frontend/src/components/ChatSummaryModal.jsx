import { useState, useEffect } from "react";
import { X, Sparkles, FileText, RefreshCw, Loader2 } from "lucide-react";
import { summarizeConversationAPI } from "../utils/api";
import toast from "react-hot-toast";
import { Button } from "./ui/button";

const ChatSummaryModal = ({ isOpen, onClose, conversationId }) => {
    const [summary, setSummary] = useState("");
    const [messageCount, setMessageCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && conversationId) {
            fetchSummary();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, conversationId]);

    const fetchSummary = async () => {
        setLoading(true);
        setSummary("");
        try {
            const { data } = await summarizeConversationAPI(conversationId);
            setSummary(data.summary);
            setMessageCount(data.messageCount || 0);
        } catch (err) {
            console.error("Summary failed:", err);
            toast.error("Failed to generate summary.");
            setSummary("Could not generate a summary at this time.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleClose = () => {
        onClose();
        setSummary("");
        setMessageCount(0);
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
                            <FileText size={18} className="text-accent" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-content-primary">Chat Summary</h3>
                    </div>
                    <button 
                        className="rounded-full bg-surface-secondary p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary" 
                        onClick={handleClose}
                        disabled={loading}
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col p-6 sm:px-8 sm:py-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 size={32} className="animate-spin text-accent" />
                            <div className="text-center flex flex-col gap-1">
                                <p className="text-sm font-semibold text-content-primary">Analyzing conversation...</p>
                                <span className="text-xs text-content-muted">This may take a moment</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 animate-fade-in">
                            {messageCount > 0 && (
                                <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2">
                                    <Sparkles size={16} className="text-accent shrink-0" />
                                    <span className="text-sm font-semibold text-accent">Based on {messageCount} messages</span>
                                </div>
                            )}
                            
                            <div className="text-sm leading-relaxed text-content-primary whitespace-pre-wrap rounded-2xl bg-surface-bg p-5 border border-border/50 shadow-sm max-h-[400px] overflow-y-auto">
                                {summary}
                            </div>
                            
                            <Button 
                                variant="outline" 
                                className="mt-2 w-full flex items-center justify-center gap-2 border-border hover:bg-surface-hover hover:text-content-primary" 
                                onClick={fetchSummary}
                            >
                                <RefreshCw size={16} />
                                Regenerate Summary
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatSummaryModal;
