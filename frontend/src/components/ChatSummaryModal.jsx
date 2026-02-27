import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, FileText, RefreshCw } from "lucide-react";
import { summarizeConversationAPI } from "../utils/api";
import toast from "react-hot-toast";

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
        <div className="summary-modal-overlay" onClick={handleClose}>
            <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="summary-modal-header">
                    <div className="summary-modal-header-left">
                        <FileText size={20} className="summary-modal-icon" />
                        <h3>Chat Summary</h3>
                    </div>
                    <button className="summary-modal-close" onClick={handleClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="summary-modal-content">
                    {loading ? (
                        <div className="summary-modal-loading">
                            <Loader2 size={32} className="animate-spin summary-modal-spinner" />
                            <p>Analyzing conversation...</p>
                            <span>This may take a moment</span>
                        </div>
                    ) : (
                        <>
                            {messageCount > 0 && (
                                <div className="summary-modal-meta">
                                    <Sparkles size={14} />
                                    <span>Based on {messageCount} messages</span>
                                </div>
                            )}
                            <div className="summary-modal-text">{summary}</div>
                            <button className="summary-modal-refresh" onClick={fetchSummary}>
                                <RefreshCw size={14} />
                                Regenerate Summary
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatSummaryModal;
