import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import { Send, ArrowLeft, Smile, MoreVertical, ShieldOff, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

const ChatWindow = ({ onBack }) => {
    const { user } = useAuth();
    const {
        selectedConversation,
        messages,
        loadingMessages,
        sendMessage,
        resetTypingTimeout,
        getTypingUsers,
        blockUser,
        unblockUser,
        checkBlockStatus,
    } = useChat();
    const { isUserOnline } = useSocket();
    const [input, setInput] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when conversation changes
    useEffect(() => {
        inputRef.current?.focus();
    }, [selectedConversation?.id]);

    // Check block status when conversation changes
    useEffect(() => {
        const checkBlock = async () => {
            if (!selectedConversation) return;
            const otherUser = selectedConversation.participants?.find(
                (p) => p.user.id !== user?.id
            );
            if (otherUser?.user?.id) {
                const blocked = await checkBlockStatus(otherUser.user.id);
                setIsBlocked(blocked);
            }
        };
        checkBlock();
    }, [selectedConversation?.id, user?.id, checkBlockStatus]);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || isBlocked) return;
        sendMessage(input.trim());
        setInput("");
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (e.target.value.trim()) {
            resetTypingTimeout();
        }
    };

    const handleBlock = async () => {
        const otherUser = selectedConversation?.participants?.find(
            (p) => p.user.id !== user?.id
        );
        if (!otherUser?.user?.id) return;

        setBlockLoading(true);
        try {
            if (isBlocked) {
                const success = await unblockUser(otherUser.user.id);
                if (success) {
                    setIsBlocked(false);
                    toast.success("User unblocked");
                }
            } else {
                const success = await blockUser(otherUser.user.id);
                if (success) {
                    setIsBlocked(true);
                    toast.success("User blocked");
                }
            }
        } catch (error) {
            toast.error("Action failed");
        } finally {
            setBlockLoading(false);
            setShowMenu(false);
        }
    };

    if (!selectedConversation) return null;

    // Get the other participant(s) for display
    const otherParticipants = selectedConversation.participants?.filter(
        (p) => p.user.id !== user?.id
    ) || [];
    const chatName = selectedConversation.isGroup
        ? selectedConversation.name
        : otherParticipants[0]?.user?.displayName || "Unknown";
    const chatAvatar = otherParticipants[0]?.user?.avatarUrl;
    const isOnline = otherParticipants[0]?.user?.id
        ? isUserOnline(otherParticipants[0].user.id)
        : false;

    // Typing indicator
    const typingUserIds = getTypingUsers(selectedConversation.id);
    const typingNames = typingUserIds.map((id) => {
        const participant = selectedConversation.participants?.find((p) => p.user.id === id);
        return participant?.user?.displayName || "Someone";
    });

    const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

    const getAvatarColor = (name) => {
        const colors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
        let hash = 0;
        for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" }) +
            " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDateSeparator = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return "Today";
        if (isYesterday) return "Yesterday";
        return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    };

    // Group messages with date separators
    const shouldShowDateSeparator = (msg, index) => {
        if (index === 0) return true;
        const prevDate = new Date(messages[index - 1].createdAt).toDateString();
        const currDate = new Date(msg.createdAt).toDateString();
        return prevDate !== currDate;
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: "var(--bg-chat)" }}>
            {/* ── Chat Header ──────────────────────────────── */}
            <div
                className="flex items-center gap-3 px-5 py-3 border-b"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}
            >
                {/* Back button (mobile) */}
                <button
                    className="chat-back-btn md:hidden p-2 rounded-lg transition-fast"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={onBack}
                >
                    <ArrowLeft size={20} />
                </button>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    {chatAvatar ? (
                        <img
                            src={chatAvatar}
                            alt={chatName}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                            style={{ backgroundColor: getAvatarColor(chatName) }}
                        >
                            {getInitials(chatName)}
                        </div>
                    )}
                    {isOnline && (
                        <div
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                            style={{ backgroundColor: "var(--online)", borderColor: "var(--bg-secondary)" }}
                        />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {chatName}
                    </h3>
                    <p className="text-xs" style={{ color: isOnline ? "var(--online)" : "var(--text-muted)" }}>
                        {typingNames.length > 0
                            ? `${typingNames.join(", ")} typing...`
                            : isOnline
                                ? "Online"
                                : "Offline"}
                    </p>
                </div>

                {/* More menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        className="p-2 rounded-lg transition-fast"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={() => setShowMenu(!showMenu)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                        <MoreVertical size={18} />
                    </button>

                    {showMenu && (
                        <div
                            className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10"
                            style={{
                                backgroundColor: "var(--bg-secondary)",
                                border: "1px solid var(--border)",
                                minWidth: "160px",
                            }}
                        >
                            <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-fast text-left"
                                style={{
                                    color: isBlocked ? "var(--online)" : "var(--error)",
                                }}
                                onClick={handleBlock}
                                disabled={blockLoading}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                                {isBlocked ? <ShieldOff size={16} /> : <ShieldAlert size={16} />}
                                {blockLoading ? "Loading..." : isBlocked ? "Unblock User" : "Block User"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Blocked Banner ──────────────────────────── */}
            {isBlocked && (
                <div
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm"
                    style={{
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        color: "var(--error)",
                        borderBottom: "1px solid var(--border)",
                    }}
                >
                    <ShieldAlert size={14} />
                    You have blocked this user. Unblock to continue chatting.
                </div>
            )}

            {/* ── Messages Area ─────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 chat-messages-area">
                {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="chat-loading-spinner" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                No messages yet. Say hello! 👋
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {messages.map((msg, index) => {
                            const isMine = msg.sender?.id === user?.id || msg.senderId === user?.id;
                            const showAvatar =
                                !isMine &&
                                (index === 0 || messages[index - 1]?.sender?.id !== msg.sender?.id);
                            const showDate = shouldShowDateSeparator(msg, index);

                            return (
                                <div key={msg.id}>
                                    {/* Date separator */}
                                    {showDate && (
                                        <div className="chat-date-separator">
                                            <span>{formatDateSeparator(msg.createdAt)}</span>
                                        </div>
                                    )}

                                    <div
                                        className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                                        style={{ marginTop: showAvatar || showDate ? "12px" : "2px" }}
                                    >
                                        {/* Sender avatar (only for received msgs) */}
                                        <div className="w-7 flex-shrink-0">
                                            {showAvatar && !isMine && (
                                                msg.sender?.avatarUrl ? (
                                                    <img
                                                        src={msg.sender.avatarUrl}
                                                        alt={msg.sender.displayName}
                                                        className="w-7 h-7 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                        style={{ backgroundColor: getAvatarColor(msg.sender?.displayName) }}
                                                    >
                                                        {getInitials(msg.sender?.displayName)}
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {/* Message bubble */}
                                        <div
                                            className={`chat-bubble ${isMine ? "chat-bubble-sent" : "chat-bubble-received"}`}
                                        >
                                            <p className="text-sm" style={{ lineHeight: "1.45" }}>{msg.content}</p>
                                            <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Typing indicator */}
                        {typingNames.length > 0 && (
                            <div className="flex items-end gap-2 flex-row" style={{ marginTop: "8px" }}>
                                <div className="w-7 flex-shrink-0" />
                                <div className="chat-typing-indicator">
                                    <div className="chat-typing-dots">
                                        <span className="chat-typing-dot" />
                                        <span className="chat-typing-dot" />
                                        <span className="chat-typing-dot" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* ── Message Input ──────────────────────────────── */}
            <form
                onSubmit={handleSend}
                className="flex items-center gap-3 px-4 py-3 border-t"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}
            >
                <button
                    type="button"
                    className="p-2 rounded-lg transition-fast flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                >
                    <Smile size={20} />
                </button>

                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder={isBlocked ? "You blocked this user" : "Type a message..."}
                    disabled={isBlocked}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm outline-none"
                    style={{
                        backgroundColor: "var(--bg-input)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                        opacity: isBlocked ? 0.5 : 1,
                    }}
                />

                <button
                    type="submit"
                    disabled={!input.trim() || isBlocked}
                    className="p-2.5 rounded-xl transition-fast flex-shrink-0"
                    style={{
                        backgroundColor: input.trim() && !isBlocked ? "var(--accent)" : "var(--bg-input)",
                        color: input.trim() && !isBlocked ? "#fff" : "var(--text-muted)",
                        cursor: input.trim() && !isBlocked ? "pointer" : "default",
                    }}
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;
