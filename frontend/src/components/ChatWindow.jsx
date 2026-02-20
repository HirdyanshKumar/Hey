import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import { Send, ArrowLeft, Smile } from "lucide-react";

const ChatWindow = ({ onBack }) => {
    const { user } = useAuth();
    const { selectedConversation, messages, loadingMessages, sendMessage } = useChat();
    const { isUserOnline } = useSocket();
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when conversation changes
    useEffect(() => {
        inputRef.current?.focus();
    }, [selectedConversation?.id]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input.trim());
        setInput("");
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
                        {isOnline ? "Online" : "Offline"}
                    </p>
                </div>
            </div>

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

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                                    style={{ marginTop: showAvatar || index === 0 ? "12px" : "2px" }}
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
                            );
                        })}
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
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm outline-none"
                    style={{
                        backgroundColor: "var(--bg-input)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                    }}
                />

                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2.5 rounded-xl transition-fast flex-shrink-0"
                    style={{
                        backgroundColor: input.trim() ? "var(--accent)" : "var(--bg-input)",
                        color: input.trim() ? "#fff" : "var(--text-muted)",
                        cursor: input.trim() ? "pointer" : "default",
                    }}
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;
