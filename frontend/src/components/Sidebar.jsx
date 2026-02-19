import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Search, Settings, Plus, Hash, MessageCircle } from "lucide-react";

// Demo data — will be replaced with real API data in Phase 5
const DEMO_DMS = [
    { id: 1, name: "Sarah Jenkins", lastMessage: "You: Just pushing the fix now...", time: "12:42 PM", online: true, unread: 0, avatar: null },
    { id: 2, name: "Mike Ross", lastMessage: "Can you review the PR?", time: "Yesterday", online: false, unread: 0, avatar: null },
    { id: 3, name: "Alex Chen", lastMessage: "Design assets for Q4", time: "10:05 AM", online: true, unread: 2, avatar: null },
];

const DEMO_CHANNELS = [
    { id: 101, name: "general", lastMessage: "System: Welcome everyone!", type: "channel" },
    { id: 102, name: "engineering-interns", lastMessage: "David: Deployment failed :(", type: "channel" },
];

const Sidebar = ({ selectedChat, onSelectChat }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const { user } = useAuth();
    const { isConnected } = useSocket();
    const navigate = useNavigate();

    // Generate initials from name
    const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

    // Random avatar color based on name
    const getAvatarColor = (name) => {
        const colors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
        let hash = 0;
        for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <aside
            className="flex flex-col h-full border-r"
            style={{
                width: "320px",
                minWidth: "320px",
                backgroundColor: "var(--bg-sidebar)",
                borderColor: "var(--border)",
            }}
        >
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                        style={{ backgroundColor: "var(--accent)" }}
                    >
                        H
                    </div>
                    <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Hey!!</h1>
                </div>
                <button
                    className="p-2 rounded-lg transition-fast"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => navigate("/profile")}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Profile & Settings"
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* ── Search ─────────────────────────────────── */}
            <div className="px-4 pb-3">
                <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "var(--bg-input)" }}
                >
                    <Search size={16} style={{ color: "var(--text-muted)" }} />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm flex-1"
                        style={{ color: "var(--text-primary)" }}
                    />
                </div>
            </div>

            {/* ── Chat List (scrollable) ─────────────────── */}
            <div className="flex-1 overflow-y-auto px-2">
                {/* Direct Messages */}
                <div className="px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Direct Messages
                    </span>
                </div>

                {DEMO_DMS.filter((dm) => dm.name.toLowerCase().includes(searchQuery.toLowerCase())).map((dm) => (
                    <button
                        key={dm.id}
                        onClick={() => onSelectChat(dm)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-fast text-left"
                        style={{
                            backgroundColor: selectedChat?.id === dm.id ? "var(--bg-active)" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                            if (selectedChat?.id !== dm.id) e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                        }}
                        onMouseLeave={(e) => {
                            if (selectedChat?.id !== dm.id) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                                style={{ backgroundColor: getAvatarColor(dm.name) }}
                            >
                                {getInitials(dm.name)}
                            </div>
                            {dm.online && (
                                <div
                                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                                    style={{ backgroundColor: "var(--online)", borderColor: "var(--bg-sidebar)" }}
                                />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                    {dm.name}
                                </span>
                                <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
                                    {dm.time}
                                </span>
                            </div>
                            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                {dm.lastMessage}
                            </p>
                        </div>

                        {/* Unread badge */}
                        {dm.unread > 0 && (
                            <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: "var(--accent)" }}
                            >
                                {dm.unread}
                            </div>
                        )}
                    </button>
                ))}

                {/* Channels */}
                <div className="px-3 py-2 mt-3">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Channels
                    </span>
                </div>

                {DEMO_CHANNELS.map((ch) => (
                    <button
                        key={ch.id}
                        onClick={() => onSelectChat(ch)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-fast text-left"
                        style={{
                            backgroundColor: selectedChat?.id === ch.id ? "var(--bg-active)" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                            if (selectedChat?.id !== ch.id) e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                        }}
                        onMouseLeave={(e) => {
                            if (selectedChat?.id !== ch.id) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: "var(--bg-input)" }}
                        >
                            <Hash size={18} style={{ color: "var(--accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                {ch.name}
                            </span>
                            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                {ch.lastMessage}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Current User Footer ────────────────────── */}
            <div
                className="flex items-center gap-3 px-4 py-3 border-t cursor-pointer"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}
                onClick={() => navigate("/profile")}
            >
                <div className="relative">
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-9 h-9 rounded-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ backgroundColor: getAvatarColor(user?.displayName) }}
                        >
                            {getInitials(user?.displayName)}
                        </div>
                    )}
                    <div
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{
                            backgroundColor: isConnected ? "var(--online)" : "var(--text-muted)",
                            borderColor: "var(--bg-secondary)",
                        }}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {user?.displayName || "User"}
                    </p>
                    <p className="text-xs" style={{ color: isConnected ? "var(--online)" : "var(--text-secondary)" }}>
                        {isConnected ? "Online" : "Offline"}
                    </p>
                </div>
                <MessageCircle size={16} style={{ color: "var(--text-muted)" }} />
            </div>
        </aside>
    );
};

export default Sidebar;
