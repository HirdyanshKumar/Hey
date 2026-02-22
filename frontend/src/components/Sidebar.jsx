import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useChat } from "../context/ChatContext";
import { Search, Settings, Plus, X, MessageCircle, Loader2, Users, SearchIcon } from "lucide-react";
import api from "../utils/api";
import MessageSearchModal from "./MessageSearchModal";

const Sidebar = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showNewChat, setShowNewChat] = useState(false);
    const [newChatSearch, setNewChatSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [creating, setCreating] = useState(false);

    const { user } = useAuth();
    const { isConnected, isUserOnline } = useSocket();
    const {
        conversations,
        selectedConversation,
        loadingConversations,
        selectConversation,
        createConversation,
        createGroup,
    } = useChat();
    const navigate = useNavigate();

    // Group creation state
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupDesc, setGroupDesc] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [groupSearchQuery, setGroupSearchQuery] = useState("");
    const [groupSearchResults, setGroupSearchResults] = useState([]);
    const [groupSearching, setGroupSearching] = useState(false);
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Global Message Search Modal
    const [showMessageSearch, setShowMessageSearch] = useState(false);

    // Generate initials from name
    const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

    // Random avatar color based on name
    const getAvatarColor = (name) => {
        const colors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
        let hash = 0;
        for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    // Format time for last message
    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        if (isYesterday) return "Yesterday";
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    // Get display info for a conversation
    const getConversationDisplay = (conv) => {
        const otherParticipants = conv.participants?.filter((p) => p.user.id !== user?.id) || [];
        const other = otherParticipants[0]?.user;
        const name = conv.isGroup ? conv.name : other?.displayName || "Unknown";
        const avatar = conv.isGroup ? null : other?.avatarUrl || null;
        const online = conv.isGroup ? false : (other?.id ? isUserOnline(other.id) : false);
        const lastMsg = conv.messages?.[0];
        let lastMessagePreview = "";
        if (lastMsg) {
            const isMine = lastMsg.senderId === user?.id || lastMsg.sender?.id === user?.id;
            const senderName = conv.isGroup && !isMine ? (lastMsg.sender?.displayName?.split(" ")[0] + ": ") : (isMine ? "You: " : "");
            lastMessagePreview = senderName + (lastMsg.content || "");
        }
        const time = lastMsg?.createdAt || conv.updatedAt;

        return { name, avatar, online, lastMessagePreview, time, isGroup: conv.isGroup };
    };

    // User search for new chat
    const handleNewChatSearch = useCallback(
        async (query) => {
            setNewChatSearch(query);
            if (!query || query.trim().length < 1) {
                setSearchResults([]);
                return;
            }

            try {
                setSearching(true);
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
                setSearchResults(data.users || []);
            } catch (error) {
                console.error("User search failed:", error);
            } finally {
                setSearching(false);
            }
        },
        []
    );

    // Start conversation with selected user
    const handleStartConversation = async (targetUser) => {
        try {
            setCreating(true);
            await createConversation(targetUser.id);
            setShowNewChat(false);
            setNewChatSearch("");
            setSearchResults([]);
        } catch (error) {
            console.error("Failed to start conversation:", error);
        } finally {
            setCreating(false);
        }
    };

    // Filter conversations by search query
    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery.trim()) return true;
        const { name } = getConversationDisplay(conv);
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const dmConversations = filteredConversations.filter((c) => !c.isGroup);
    const groupConversations = filteredConversations.filter((c) => c.isGroup);

    // Group member search
    const handleGroupSearch = useCallback(async (query) => {
        setGroupSearchQuery(query);
        if (!query || query.trim().length < 1) {
            setGroupSearchResults([]);
            return;
        }
        try {
            setGroupSearching(true);
            const { data } = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
            const selectedIds = selectedMembers.map((m) => m.id);
            setGroupSearchResults((data.users || []).filter((u) => !selectedIds.includes(u.id)));
        } catch (error) {
            console.error("Group search failed:", error);
        } finally {
            setGroupSearching(false);
        }
    }, [selectedMembers]);

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedMembers.length < 1) return;
        setCreatingGroup(true);
        try {
            await createGroup(groupName, groupDesc, selectedMembers.map((m) => m.id));
            setShowNewGroup(false);
            setGroupName("");
            setGroupDesc("");
            setSelectedMembers([]);
            setGroupSearchQuery("");
            setGroupSearchResults([]);
        } catch (error) {
            console.error("Failed to create group:", error);
        } finally {
            setCreatingGroup(false);
        }
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
                <div className="flex items-center gap-1">
                    <button
                        className="p-2 rounded-lg transition-fast"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={() => setShowMessageSearch(true)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        title="Search Messages"
                    >
                        <SearchIcon size={18} />
                    </button>
                    <button
                        className="p-2 rounded-lg transition-fast"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={() => setShowNewChat(true)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        title="New Chat"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        className="p-2 rounded-lg transition-fast"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={() => setShowNewGroup(true)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        title="New Group"
                    >
                        <Users size={18} />
                    </button>
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
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm flex-1"
                        style={{ color: "var(--text-primary)" }}
                    />
                </div>
            </div>

            {/* ── Chat List (scrollable) ─────────────────── */}
            <div className="flex-1 overflow-y-auto px-2">
                <div className="px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Direct Messages
                    </span>
                </div>

                {loadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="chat-loading-spinner" />
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {searchQuery ? "No conversations found." : "No conversations yet."}
                        </p>
                        <button
                            className="mt-2 text-sm font-medium transition-fast"
                            style={{ color: "var(--accent)" }}
                            onClick={() => setShowNewChat(true)}
                        >
                            Start a new chat
                        </button>
                    </div>
                ) : (
                    <>
                        {/* DM Conversations */}
                        {dmConversations.length > 0 && (
                            <>
                                <div className="px-3 py-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                        Direct Messages
                                    </span>
                                </div>
                                {dmConversations.map((conv) => {
                                    const { name, avatar, online, lastMessagePreview, time } = getConversationDisplay(conv);
                                    const isSelected = selectedConversation?.id === conv.id;
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => selectConversation(conv.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-fast text-left"
                                            style={{ backgroundColor: isSelected ? "var(--bg-active)" : "transparent" }}
                                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
                                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                                        >
                                            <div className="relative flex-shrink-0">
                                                {avatar ? (
                                                    <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ backgroundColor: getAvatarColor(name) }}>
                                                        {getInitials(name)}
                                                    </div>
                                                )}
                                                {online && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2" style={{ backgroundColor: "var(--online)", borderColor: "var(--bg-sidebar)" }} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{name}</span>
                                                    <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>{formatTime(time)}</span>
                                                </div>
                                                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                                    {lastMessagePreview || "No messages yet"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </>
                        )}

                        {/* Group Conversations */}
                        {groupConversations.length > 0 && (
                            <>
                                <div className="px-3 py-2 mt-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                        Groups
                                    </span>
                                </div>
                                {groupConversations.map((conv) => {
                                    const { name, lastMessagePreview, time } = getConversationDisplay(conv);
                                    const isSelected = selectedConversation?.id === conv.id;
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => selectConversation(conv.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-fast text-left"
                                            style={{ backgroundColor: isSelected ? "var(--bg-active)" : "transparent" }}
                                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
                                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                                        >
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0" style={{ backgroundColor: getAvatarColor(name) }}>
                                                {getInitials(name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{name}</span>
                                                    <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>{formatTime(time)}</span>
                                                </div>
                                                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                                    {lastMessagePreview || "No messages yet"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </>
                )}
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

            {/* ── New Chat Modal ─────────────────────────── */}
            {
                showNewChat && (
                    <div className="new-chat-overlay" onClick={() => setShowNewChat(false)}>
                        <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                                    New Conversation
                                </h3>
                                <button
                                    className="p-1.5 rounded-lg transition-fast"
                                    style={{ color: "var(--text-muted)" }}
                                    onClick={() => setShowNewChat(false)}
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
                                    placeholder="Search by name or email..."
                                    value={newChatSearch}
                                    onChange={(e) => handleNewChatSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm flex-1"
                                    style={{ color: "var(--text-primary)" }}
                                    autoFocus
                                />
                            </div>

                            {/* Search Results */}
                            <div className="new-chat-results">
                                {searching ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 size={20} className="auth-spinner" style={{ color: "var(--accent)" }} />
                                    </div>
                                ) : searchResults.length === 0 && newChatSearch.trim() ? (
                                    <div className="text-center py-6">
                                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                            No users found
                                        </p>
                                    </div>
                                ) : !newChatSearch.trim() ? (
                                    <div className="text-center py-6">
                                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                            Search for a user to start chatting
                                        </p>
                                    </div>
                                ) : (
                                    searchResults.map((u) => (
                                        <button
                                            key={u.id}
                                            onClick={() => handleStartConversation(u)}
                                            disabled={creating}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-fast text-left"
                                            style={{ opacity: creating ? 0.5 : 1 }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                        >
                                            <div className="relative flex-shrink-0">
                                                {u.avatarUrl ? (
                                                    <img
                                                        src={u.avatarUrl}
                                                        alt={u.displayName}
                                                        className="w-9 h-9 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                        style={{ backgroundColor: getAvatarColor(u.displayName) }}
                                                    >
                                                        {getInitials(u.displayName)}
                                                    </div>
                                                )}
                                                {u.isOnline && (
                                                    <div
                                                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                                        style={{ backgroundColor: "var(--online)", borderColor: "var(--bg-secondary)" }}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                                    {u.displayName}
                                                </p>
                                                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                                    {u.email}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── New Group Modal ────────────────────────── */}
            {
                showNewGroup && (
                    <div className="new-chat-overlay" onClick={() => setShowNewGroup(false)}>
                        <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                                    Create Group
                                </h3>
                                <button
                                    className="p-1.5 rounded-lg transition-fast"
                                    style={{ color: "var(--text-muted)" }}
                                    onClick={() => setShowNewGroup(false)}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Group Name */}
                            <input
                                type="text"
                                placeholder="Group name *"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full py-2.5 px-3 rounded-lg text-sm outline-none mb-2"
                                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                                maxLength={50}
                                autoFocus
                            />

                            {/* Group Description */}
                            <input
                                type="text"
                                placeholder="Description (optional)"
                                value={groupDesc}
                                onChange={(e) => setGroupDesc(e.target.value)}
                                className="w-full py-2.5 px-3 rounded-lg text-sm outline-none mb-3"
                                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                                maxLength={200}
                            />

                            {/* Selected Members */}
                            {selectedMembers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {selectedMembers.map((m) => (
                                        <span
                                            key={m.id}
                                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                                        >
                                            {m.displayName}
                                            <button onClick={() => setSelectedMembers((prev) => prev.filter((p) => p.id !== m.id))} className="ml-0.5">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Member Search */}
                            <div
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-3"
                                style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}
                            >
                                <Search size={16} style={{ color: "var(--text-muted)" }} />
                                <input
                                    type="text"
                                    placeholder="Search users to add..."
                                    value={groupSearchQuery}
                                    onChange={(e) => handleGroupSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm flex-1"
                                    style={{ color: "var(--text-primary)" }}
                                />
                            </div>

                            {/* Search Results */}
                            <div className="new-chat-results" style={{ maxHeight: "150px" }}>
                                {groupSearching ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 size={16} className="auth-spinner" style={{ color: "var(--accent)" }} />
                                    </div>
                                ) : (
                                    groupSearchResults.map((u) => (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedMembers((prev) => [...prev, u]);
                                                setGroupSearchResults((prev) => prev.filter((r) => r.id !== u.id));
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 transition-fast text-left text-sm"
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                        >
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getAvatarColor(u.displayName) }}>
                                                {getInitials(u.displayName)}
                                            </div>
                                            <span style={{ color: "var(--text-primary)" }}>{u.displayName}</span>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Create Button */}
                            <button
                                onClick={handleCreateGroup}
                                disabled={!groupName.trim() || selectedMembers.length < 1 || creatingGroup}
                                className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold transition-fast"
                                style={{
                                    backgroundColor: groupName.trim() && selectedMembers.length > 0 ? "var(--accent)" : "var(--bg-input)",
                                    color: groupName.trim() && selectedMembers.length > 0 ? "#fff" : "var(--text-muted)",
                                    border: "none",
                                    cursor: groupName.trim() && selectedMembers.length > 0 ? "pointer" : "default",
                                    opacity: creatingGroup ? 0.5 : 1,
                                }}
                            >
                                {creatingGroup ? "Creating..." : `Create Group (${selectedMembers.length} members)`}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ── Global Message Search Modal ───────────────── */}
            {showMessageSearch && <MessageSearchModal onClose={() => setShowMessageSearch(false)} />}
        </aside >
    );
};

export default Sidebar;
