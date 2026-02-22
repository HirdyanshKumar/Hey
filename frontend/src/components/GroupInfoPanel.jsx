import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import api from "../utils/api";
import {
    X, Shield, ShieldOff, UserPlus, UserMinus, LogOut, Trash2,
    Edit3, Save, Search, Loader2, Crown, Users,
} from "lucide-react";
import toast from "react-hot-toast";

const GroupInfoPanel = ({ conversation, onClose }) => {
    const { user } = useAuth();
    const { updateGroup, addMembers, removeMember, promoteMember, demoteMember, leaveGroup, deleteGroup } = useChat();
    const { isUserOnline } = useSocket();

    const [editing, setEditing] = useState(false);
    const [groupName, setGroupName] = useState(conversation?.name || "");
    const [groupDesc, setGroupDesc] = useState(conversation?.description || "");
    const [saving, setSaving] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    if (!conversation?.isGroup) return null;

    const currentParticipant = conversation.participants?.find((p) => p.user.id === user?.id);
    const isAdmin = currentParticipant?.role === "admin";
    const isCreator = conversation.createdById === user?.id;

    const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";
    const getAvatarColor = (name) => {
        const colors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
        let hash = 0;
        for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const handleSave = async () => {
        if (!groupName.trim()) {
            toast.error("Group name is required.");
            return;
        }
        setSaving(true);
        try {
            await updateGroup(conversation.id, { name: groupName, description: groupDesc });
            toast.success("Group updated!");
            setEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update group.");
        } finally {
            setSaving(false);
        }
    };

    const handleSearchUsers = async (query) => {
        setSearchQuery(query);
        if (!query || query.trim().length < 1) {
            setSearchResults([]);
            return;
        }
        try {
            setSearching(true);
            const { data } = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
            // Filter out existing members
            const existingIds = conversation.participants.map((p) => p.user.id);
            setSearchResults((data.users || []).filter((u) => !existingIds.includes(u.id)));
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async (targetUser) => {
        setActionLoading(targetUser.id);
        try {
            await addMembers(conversation.id, [targetUser.id]);
            toast.success(`${targetUser.displayName} added!`);
            setSearchResults((prev) => prev.filter((u) => u.id !== targetUser.id));
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add member.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveMember = async (targetUserId, displayName) => {
        setActionLoading(targetUserId);
        try {
            await removeMember(conversation.id, targetUserId);
            toast.success(`${displayName} removed.`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to remove member.");
        } finally {
            setActionLoading(null);
        }
    };

    const handlePromote = async (targetUserId, displayName) => {
        setActionLoading(targetUserId);
        try {
            await promoteMember(conversation.id, targetUserId);
            toast.success(`${displayName} is now an admin.`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to promote.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDemote = async (targetUserId, displayName) => {
        setActionLoading(targetUserId);
        try {
            await demoteMember(conversation.id, targetUserId);
            toast.success(`${displayName} is no longer an admin.`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to demote.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleLeave = async () => {
        if (!confirm("Are you sure you want to leave this group?")) return;
        try {
            await leaveGroup(conversation.id);
            toast.success("Left the group.");
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to leave group.");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this group? All messages will be lost.")) return;
        try {
            await deleteGroup(conversation.id);
            toast.success("Group deleted.");
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete group.");
        }
    };

    return (
        <div className="group-info-overlay" onClick={onClose}>
            <div className="group-info-panel" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                        Group Info
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

                {/* Group Avatar & Name */}
                <div className="flex flex-col items-center gap-2 mb-5">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                        style={{ backgroundColor: getAvatarColor(conversation.name) }}
                    >
                        {getInitials(conversation.name)}
                    </div>
                    {editing ? (
                        <div className="w-full flex flex-col gap-2">
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full py-2 px-3 rounded-lg text-sm outline-none"
                                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                                placeholder="Group name"
                                maxLength={50}
                            />
                            <textarea
                                value={groupDesc}
                                onChange={(e) => setGroupDesc(e.target.value)}
                                className="w-full py-2 px-3 rounded-lg text-sm outline-none resize-none"
                                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "inherit" }}
                                placeholder="Description (optional)"
                                maxLength={200}
                                rows={2}
                            />
                            <div className="flex gap-2 justify-end">
                                <button className="profile-btn profile-btn-secondary text-xs py-1.5 px-3" onClick={() => { setEditing(false); setGroupName(conversation.name); setGroupDesc(conversation.description || ""); }}>
                                    <X size={14} /> Cancel
                                </button>
                                <button className="profile-btn profile-btn-primary text-xs py-1.5 px-3" onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 size={14} className="auth-spinner" /> : <Save size={14} />}
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{conversation.name}</h4>
                            {conversation.description && (
                                <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>{conversation.description}</p>
                            )}
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                <Users size={12} className="inline mr-1" />{conversation.participants?.length} members
                            </p>
                            {isAdmin && (
                                <button
                                    className="text-xs font-medium transition-fast"
                                    style={{ color: "var(--accent)" }}
                                    onClick={() => setEditing(true)}
                                >
                                    <Edit3 size={12} className="inline mr-1" />Edit Info
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Members */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            Members
                        </span>
                        {isAdmin && (
                            <button
                                className="text-xs font-medium flex items-center gap-1 transition-fast"
                                style={{ color: "var(--accent)" }}
                                onClick={() => setShowAddMember(!showAddMember)}
                            >
                                <UserPlus size={14} /> Add
                            </button>
                        )}
                    </div>

                    {/* Add Member Search */}
                    {showAddMember && (
                        <div className="mb-3">
                            <div
                                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                                style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}
                            >
                                <Search size={14} style={{ color: "var(--text-muted)" }} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchUsers(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs flex-1"
                                    style={{ color: "var(--text-primary)" }}
                                    autoFocus
                                />
                            </div>
                            {searching && (
                                <div className="flex justify-center py-2">
                                    <Loader2 size={16} className="auth-spinner" style={{ color: "var(--accent)" }} />
                                </div>
                            )}
                            {searchResults.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => handleAddMember(u)}
                                    disabled={actionLoading === u.id}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 transition-fast text-left text-xs"
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                >
                                    {u.avatarUrl ? (
                                        <img src={u.avatarUrl} alt={u.displayName} className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getAvatarColor(u.displayName) }}>
                                            {getInitials(u.displayName)}
                                        </div>
                                    )}
                                    <span style={{ color: "var(--text-primary)" }}>{u.displayName}</span>
                                    <UserPlus size={14} className="ml-auto" style={{ color: "var(--accent)" }} />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Member List */}
                    <div className="group-member-list">
                        {conversation.participants?.map((p) => {
                            const isMe = p.user.id === user?.id;
                            const isParticipantCreator = p.user.id === conversation.createdById;
                            const online = isUserOnline(p.user.id);

                            return (
                                <div key={p.user.id} className="group-member-item">
                                    <div className="relative flex-shrink-0">
                                        {p.user.avatarUrl ? (
                                            <img src={p.user.avatarUrl} alt={p.user.displayName} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getAvatarColor(p.user.displayName) }}>
                                                {getInitials(p.user.displayName)}
                                            </div>
                                        )}
                                        {online && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ backgroundColor: "var(--online)", borderColor: "var(--bg-secondary)" }} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                                {p.user.displayName}{isMe ? " (You)" : ""}
                                            </span>
                                            {p.role === "admin" && (
                                                <span className="admin-badge">
                                                    {isParticipantCreator ? <Crown size={10} /> : <Shield size={10} />}
                                                    {isParticipantCreator ? "Creator" : "Admin"}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Admin actions on other members */}
                                    {isAdmin && !isMe && !isParticipantCreator && (
                                        <div className="flex gap-1">
                                            {p.role === "member" ? (
                                                <button
                                                    className="p-1 rounded transition-fast"
                                                    title="Promote to admin"
                                                    style={{ color: "var(--accent)" }}
                                                    onClick={() => handlePromote(p.user.id, p.user.displayName)}
                                                    disabled={actionLoading === p.user.id}
                                                >
                                                    <Shield size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    className="p-1 rounded transition-fast"
                                                    title="Demote to member"
                                                    style={{ color: "var(--away)" }}
                                                    onClick={() => handleDemote(p.user.id, p.user.displayName)}
                                                    disabled={actionLoading === p.user.id}
                                                >
                                                    <ShieldOff size={14} />
                                                </button>
                                            )}
                                            <button
                                                className="p-1 rounded transition-fast"
                                                title="Remove from group"
                                                style={{ color: "var(--error)" }}
                                                onClick={() => handleRemoveMember(p.user.id, p.user.displayName)}
                                                disabled={actionLoading === p.user.id}
                                            >
                                                <UserMinus size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-fast"
                        style={{ color: "var(--error)" }}
                        onClick={handleLeave}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                        <LogOut size={16} /> Leave Group
                    </button>
                    {isCreator && (
                        <button
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-fast"
                            style={{ color: "var(--error)" }}
                            onClick={handleDelete}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                            <Trash2 size={16} /> Delete Group
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupInfoPanel;
