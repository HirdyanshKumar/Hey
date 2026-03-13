import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useChat } from "../context/ChatContext";
import { Search, Settings, Plus, X, MessageCircle, Users, SearchIcon, Bot } from "lucide-react";
import api from "../utils/api";
import MessageSearchModal from "./MessageSearchModal";
import toast from "react-hot-toast";

import { Avatar } from "./ui/avatar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { VibeLineLogo } from "./ui/vibeline-logo";

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
        startAIChat,
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
                toast.error("Failed to search users");
            } finally {
                setSearching(false);
            }
        },
        []
    );

    const handleStartConversation = async (targetUser) => {
        try {
            setCreating(true);
            await createConversation(targetUser.id);
            setShowNewChat(false);
            setNewChatSearch("");
            setSearchResults([]);
            toast.success("Conversation started");
        } catch (error) {
            console.error("Failed to start conversation:", error);
            toast.error("Failed to start conversation");
        } finally {
            setCreating(false);
        }
    };

    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery.trim()) return true;
        const { name } = getConversationDisplay(conv);
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const dmConversations = filteredConversations.filter((c) => !c.isGroup);
    const groupConversations = filteredConversations.filter((c) => c.isGroup);

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
            toast.success("Group created!");
        } catch (error) {
            console.error("Failed to create group:", error);
            toast.error("Failed to create group");
        } finally {
            setCreatingGroup(false);
        }
    };

    return (
        <aside className="flex h-full flex-col overflow-hidden bg-surface-panel p-3.5">
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                    <VibeLineLogo size="sm" />
                    <h1 className="text-lg font-bold text-content-primary">Hey</h1>
                </div>
                <div className="flex items-center gap-1 text-content-secondary">
                    <button
                        className="rounded-lg p-2 transition-colors hover:bg-surface-hover hover:text-content-primary"
                        onClick={() => setShowMessageSearch(true)}
                        title="Search Messages"
                    >
                        <SearchIcon size={18} />
                    </button>
                    <button
                        className="rounded-lg p-2 transition-colors hover:bg-surface-hover hover:text-content-primary"
                        onClick={() => setShowNewChat(true)}
                        title="New Chat"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        className="rounded-lg p-2 transition-colors hover:bg-surface-hover hover:text-content-primary"
                        onClick={startAIChat}
                        title="Chat with AI"
                    >
                        <Bot size={18} />
                    </button>
                    <button
                        className="rounded-lg p-2 transition-colors hover:bg-surface-hover hover:text-content-primary"
                        onClick={() => setShowNewGroup(true)}
                        title="New Group"
                    >
                        <Users size={18} />
                    </button>
                    <button
                        className="rounded-lg p-2 transition-colors hover:bg-surface-hover hover:text-content-primary"
                        onClick={() => navigate("/profile")}
                        title="Profile & Settings"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* ── Search ─────────────────────────────────── */}
            <div className="relative mb-4 flex items-center">
                <Search size={16} className="absolute left-3 text-content-muted" />
                <Input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* ── Chat List ─────────────────── */}
            <div className="flex-1 overflow-y-auto pr-1">
                {loadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                        <Spinner />
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-content-muted">
                        <p>{searchQuery ? "No conversations found." : "No conversations yet."}</p>
                        {!searchQuery && (
                            <button
                                className="mt-2 text-accent transition-colors hover:text-accent-hover font-medium"
                                onClick={() => setShowNewChat(true)}
                            >
                                Start a new chat
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* DM Conversations */}
                        {dmConversations.length > 0 && (
                            <>
                                <div className="mb-1 px-1 py-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
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
                                            className={`mb-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                                isSelected ? "bg-surface-soft" : "hover:bg-surface-hover"
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <Avatar name={name} src={avatar} size="lg" />
                                                {online && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-panel bg-status-success" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`truncate text-sm font-semibold ${isSelected ? "text-content-primary" : "text-content-secondary"}`}>
                                                        {name}
                                                    </span>
                                                    <span className="ml-2 shrink-0 text-xs text-content-muted">
                                                        {formatTime(time)}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 truncate text-xs text-content-muted">
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
                                <div className="mb-1 mt-3 px-1 py-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
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
                                            className={`mb-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                                isSelected ? "bg-surface-soft" : "hover:bg-surface-hover"
                                            }`}
                                        >
                                            <div className="shrink-0">
                                                <Avatar name={name} size="lg" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`truncate text-sm font-semibold ${isSelected ? "text-content-primary" : "text-content-secondary"}`}>
                                                        {name}
                                                    </span>
                                                    <span className="ml-2 shrink-0 text-xs text-content-muted">
                                                        {formatTime(time)}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 truncate text-xs text-content-muted">
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
                className="mt-3 flex cursor-pointer items-center gap-3 pt-3 transition-opacity hover:opacity-80 border-t border-border"
                onClick={() => navigate("/profile")}
            >
                <div className="relative shrink-0">
                    <Avatar name={user?.displayName || "User"} src={user?.avatarUrl} size="md" />
                    <div
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-panel ${
                            isConnected ? "bg-status-success" : "bg-content-muted"
                        }`}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-content-primary">
                        {user?.displayName || "User"}
                    </p>
                    <p className={`text-xs ${isConnected ? "text-status-success" : "text-content-secondary"}`}>
                        {isConnected ? "Online" : "Offline"}
                    </p>
                </div>
                <MessageCircle size={16} className="text-content-muted" />
            </div>

            {/* ── New Chat Modal ─────────────────────────── */}
            {showNewChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowNewChat(false)}>
                    <div className="w-full max-w-md animate-slide-up rounded-xl border border-border bg-surface-panel p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-content-primary">
                                New Conversation
                            </h3>
                            <button
                                className="rounded-lg p-1.5 text-content-muted transition-colors hover:bg-surface-hover hover:text-content-primary"
                                onClick={() => setShowNewChat(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative mb-4 flex items-center">
                            <Search size={16} className="absolute left-3 text-content-muted" />
                            <Input
                                type="text"
                                placeholder="Search by name or email..."
                                value={newChatSearch}
                                onChange={(e) => handleNewChatSearch(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {searching ? (
                                <div className="flex justify-center py-6">
                                    <Spinner />
                                </div>
                            ) : searchResults.length === 0 && newChatSearch.trim() ? (
                                <p className="py-6 text-center text-sm text-content-muted">No users found</p>
                            ) : !newChatSearch.trim() ? (
                                <p className="py-6 text-center text-sm text-content-muted">Search for a user to start chatting</p>
                            ) : (
                                searchResults.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleStartConversation(u)}
                                        disabled={creating}
                                        className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:opacity-50"
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar name={u.displayName} src={u.avatarUrl} size="md" />
                                            {u.isOnline && (
                                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-bg bg-status-success" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate text-sm font-semibold text-content-primary">{u.displayName}</p>
                                            <p className="truncate text-xs text-content-muted">{u.email}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── New Group Modal ────────────────────────── */}
            {showNewGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowNewGroup(false)}>
                    <div className="w-full max-w-md animate-slide-up rounded-xl border border-border bg-surface-panel p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-content-primary">
                                Create Group
                            </h3>
                            <button
                                className="rounded-lg p-1.5 text-content-muted transition-colors hover:bg-surface-hover hover:text-content-primary"
                                onClick={() => setShowNewGroup(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-3">
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                                <Users size={14} /> Group Name *
                            </label>
                            <Input
                                type="text"
                                placeholder="Enter group name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                maxLength={50}
                                autoFocus
                            />
                        </div>

                        <div className="mb-3">
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                                <Settings size={14} /> Description (optional)
                            </label>
                            <Input
                                type="text"
                                placeholder="What is this group about?"
                                value={groupDesc}
                                onChange={(e) => setGroupDesc(e.target.value)}
                                maxLength={200}
                            />
                        </div>

                        {selectedMembers.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                                {selectedMembers.map((m) => (
                                    <span key={m.id} className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-white">
                                        {m.displayName}
                                        <button onClick={() => setSelectedMembers((prev) => prev.filter((p) => p.id !== m.id))} className="ml-0.5 hover:text-red-200">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                                <Plus size={14} /> Add Members
                            </label>
                            <div className="relative flex items-center">
                                <Search size={16} className="absolute left-3 text-content-muted" />
                                <Input
                                    type="text"
                                    placeholder="Search users to add..."
                                    value={groupSearchQuery}
                                    onChange={(e) => handleGroupSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="mb-4 max-h-[150px] overflow-y-auto">
                            {groupSearching ? (
                                <div className="flex justify-center py-4">
                                    <Spinner />
                                </div>
                            ) : (
                                groupSearchResults.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => {
                                            setSelectedMembers((prev) => [...prev, u]);
                                            setGroupSearchResults((prev) => prev.filter((r) => r.id !== u.id));
                                        }}
                                        className="mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                                    >
                                        <Avatar name={u.displayName} size="sm" />
                                        <span className="text-content-primary">{u.displayName}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleCreateGroup}
                            disabled={!groupName.trim() || selectedMembers.length < 1 || creatingGroup}
                        >
                            {creatingGroup ? "Creating..." : `Create Group (${selectedMembers.length} members)`}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Global Message Search Modal ───────────────── */}
            {showMessageSearch && <MessageSearchModal onClose={() => setShowMessageSearch(false)} />}
        </aside>
    );
};

export default Sidebar;
