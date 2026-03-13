import { useState, useEffect, useCallback } from "react";
import { Search, X, Calendar, FileImage, MessageSquare } from "lucide-react";
import { searchMessagesAPI } from "../utils/api";
import { useChat } from "../context/ChatContext";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { cn } from "../lib/utils";

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
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className="flex w-full max-w-[540px] max-h-[85vh] flex-col overflow-hidden rounded-[28px] border border-border bg-surface-panel shadow-elevated" 
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-5 sm:px-8">
                    <h3 className="text-xl font-bold tracking-tight text-content-primary">
                        Search Messages
                    </h3>
                    <button
                        className="rounded-full bg-surface-secondary p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                        onClick={onClose}
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-5 border-b border-border/50 bg-surface-bg px-6 py-5 sm:px-8">
                    {/* Search Field */}
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                            <Search size={14} />
                            Search Query
                        </label>
                        <div className="relative flex items-center">
                            <Search size={16} className="absolute left-3.5 text-content-muted" />
                            <Input
                                type="text"
                                placeholder="Search across all conversations..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-10"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex flex-1 flex-col gap-2">
                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                                <Calendar size={14} />
                                From Date
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full"
                                style={{ colorScheme: "dark" }}
                            />
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                                <Calendar size={14} />
                                To Date
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full"
                                style={{ colorScheme: "dark" }}
                            />
                        </div>
                    </div>

                    {/* Media Toggle */}
                    <div 
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-panel p-4 transition-colors hover:border-accent/50 hover:bg-surface-hover" 
                        onClick={() => setHasMedia(!hasMedia)}
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-content-primary">Media Only</span>
                            <span className="text-xs text-content-muted">Only show messages with attachments</span>
                        </div>
                        <button
                            type="button"
                            className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg",
                                hasMedia ? "bg-accent" : "bg-surface-elevated"
                            )}
                            role="switch"
                            aria-checked={hasMedia}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                    hasMedia ? "translate-x-5" : "translate-x-0"
                                )}
                            />
                        </button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto bg-surface-bg px-6 py-4 sm:px-8" style={{ minHeight: "300px" }}>
                    {searching ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
                            <Spinner />
                            <p className="text-sm font-medium text-content-muted">Scanning messages...</p>
                        </div>
                    ) : results.length === 0 && (query.trim() || startDate || endDate || hasMedia) ? (
                        <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center text-content-muted">
                            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated text-content-secondary shadow-inner">
                                <Search size={24} strokeWidth={2} />
                            </div>
                            <h4 className="mb-2 text-[15px] font-semibold text-content-primary">No messages found</h4>
                            <p className="max-w-[280px] text-sm leading-relaxed">
                                We couldn't find anything matching your search criteria. Try adjusting your keywords or date range.
                            </p>
                        </div>
                    ) : !query.trim() && !startDate && !endDate && !hasMedia ? (
                        <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center text-content-muted">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface-elevated opacity-60 shadow-inner">
                                <Search size={34} strokeWidth={1.5} />
                            </div>
                            <h4 className="mb-2 text-[17px] font-semibold text-content-primary">Looking for something?</h4>
                            <p className="max-w-[280px] text-[14px] leading-relaxed">
                                Enter a keyword to instantly search across all your personal chats and groups.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 pb-4">
                            {results.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => handleJumpToMessage(msg)}
                                    className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-panel p-4 text-left transition-all hover:-translate-y-[1px] hover:border-accent hover:bg-surface-hover hover:shadow-elevated"
                                >
                                    <div className="mb-2.5 flex w-full items-center justify-between">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="truncate text-[14px] font-bold text-content-primary">
                                                {msg.sender?.displayName}
                                            </span>
                                            <span className="shrink-0 rounded-md bg-surface-elevated px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-content-secondary">
                                                in {msg.conversation?.name || (msg.conversation?.isGroup ? "Group" : "Chat")}
                                            </span>
                                        </div>
                                        <span className="ml-3 shrink-0 text-[11px] font-medium text-content-muted">
                                            {formatDate(msg.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="mt-0.5 shrink-0 text-content-muted">
                                            {msg.fileType ? <FileImage size={15} /> : <MessageSquare size={15} />}
                                        </div>
                                        <p className="line-clamp-2 text-[14px] leading-relaxed text-content-secondary">
                                            {msg.content || (msg.fileType === "video" ? "Video attachment" : "Image attachment")}
                                        </p>
                                    </div>
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
