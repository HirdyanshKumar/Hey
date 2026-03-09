import { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2, Calendar } from "lucide-react";
import { searchMessagesAPI } from "../utils/api";
import { useChat } from "../context/ChatContext";

const MessageSearchModal = ({ onClose }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Optional filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [hasMedia, setHasMedia] = useState(false);

    const { selectConversation, setJumpToMessageId } = useChat();

    const performSearch = useCallback(async () => {
        if (!query.trim() && !hasMedia) return;

        setSearching(true);
        try {
            const params = {};
            if (query.trim()) params.q = query.trim();
            if (startDate) params.startDate = new Date(startDate).toISOString();
            if (endDate) params.endDate = new Date(endDate).toISOString();
            if (hasMedia) params.hasMedia = "true";

            const { data } = await searchMessagesAPI(params);
            setResults(data.messages || []);
        } catch (error) {
            console.error("Failed to search messages:", error);
        } finally {
            setSearching(false);
        }
    }, [query, startDate, endDate, hasMedia]);

    // Debounce search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timeoutId = setTimeout(() => {
            performSearch();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, startDate, endDate, hasMedia, performSearch]);

    const handleJumpToMessage = async (msg) => {
        try {
            // First select the conversation
            await selectConversation(msg.conversationId);
            // Then tell chat window to jump to message
            setJumpToMessageId(msg.id);
            // Close modal
            onClose();
        } catch (err) {
            console.error("Failed to jump to message:", err);
        }
    };

    // Helper to format result date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString([], {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="new-chat-overlay" onClick={onClose}>
            <div className="new-chat-modal" onClick={(e) => e.stopPropagation()} style={{ width: "480px", maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                        Search Messages
                    </h3>
                    <button
                        className="p-1.5 rounded-lg transition-fast"
                        style={{ color: "var(--text-muted)" }}
                        onClick={onClose}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search Input */}
                <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-3"
                    style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}
                >
                    <Search size={16} style={{ color: "var(--text-muted)" }} />
                    <input
                        type="text"
                        placeholder="Search for messages across all chats..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm flex-1"
                        style={{ color: "var(--text-primary)" }}
                        autoFocus
                    />
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-2 mb-3">
                    <div className="flex gap-2">
                        <div className="flex-1 flex flex-col">
                            <label className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>From Date</label>
                            <div className="flex items-center border rounded-lg px-2 py-1.5" style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
                                <Calendar size={14} style={{ color: "var(--text-muted)", marginRight: '6px' }} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs flex-1"
                                    style={{ color: "var(--text-primary)" }}
                                />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>To Date</label>
                            <div className="flex items-center border rounded-lg px-2 py-1.5" style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)" }}>
                                <Calendar size={14} style={{ color: "var(--text-muted)", marginRight: '6px' }} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs flex-1"
                                    style={{ color: "var(--text-primary)" }}
                                />
                            </div>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-1 w-max">
                        <input
                            type="checkbox"
                            checked={hasMedia}
                            onChange={(e) => setHasMedia(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-500"
                        />
                        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            Only show messages with media
                        </span>
                    </label>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto mt-2" style={{ minHeight: "200px" }}>
                    {searching ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={24} className="auth-spinner" style={{ color: "var(--accent)" }} />
                        </div>
                    ) : results.length === 0 && query.trim() ? (
                        <div className="text-center py-8">
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                No matching messages found.
                            </p>
                        </div>
                    ) : !query.trim() ? (
                        <div className="text-center py-8">
                            <Search size={32} className="mx-auto mb-2 opacity-50" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                Enter a keyword to start searching.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 pr-1">
                            {results.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => handleJumpToMessage(msg)}
                                    className="w-full flex flex-col p-3 rounded-lg text-left transition-fast border"
                                    style={{
                                        backgroundColor: "var(--bg-secondary)",
                                        borderColor: "var(--border)"
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                                >
                                    <div className="flex justify-between items-center w-full mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                                                {msg.sender?.displayName}
                                            </span>
                                            <span className="text-xs py-0.5 px-1.5 rounded bg-black/20" style={{ color: "var(--text-muted)" }}>
                                                in {msg.conversation?.name || (msg.conversation?.isGroup ? "Group" : "Chat")}
                                            </span>
                                        </div>
                                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                            {formatDate(msg.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                                        {msg.content || (msg.fileType === "video" ? "📹 Video attachment" : "🖼️ Image attachment")}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageSearchModal;
