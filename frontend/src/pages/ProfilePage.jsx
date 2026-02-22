import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Camera,
    Edit3,
    Save,
    X,
    User,
    Mail,
    Calendar,
    Loader2,
    Eye,
} from "lucide-react";

const ProfilePage = () => {
    const { user, updateUser } = useAuth();
    const { isConnected } = useSocket();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [readReceipts, setReadReceipts] = useState(user?.readReceiptsEnabled !== false);
    const [togglingReceipts, setTogglingReceipts] = useState(false);

    // Generate initials
    const getInitials = (name) =>
        name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "?";

    const getAvatarColor = (name) => {
        const colors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
        let hash = 0;
        for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const handleSaveProfile = async () => {
        if (displayName.trim().length < 2) {
            toast.error("Display name must be at least 2 characters.");
            return;
        }
        setSaving(true);
        try {
            const { data } = await api.put("/users/profile", { displayName, bio });
            updateUser(data.user);
            toast.success("Profile updated!");
            setIsEditing(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5 MB.");
            return;
        }

        const formData = new FormData();
        formData.append("avatar", file);

        setUploadingAvatar(true);
        try {
            const { data } = await api.put("/users/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            updateUser(data.user);
            toast.success("Avatar updated!");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to upload avatar.");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleCancelEdit = () => {
        setDisplayName(user?.displayName || "");
        setBio(user?.bio || "");
        setIsEditing(false);
    };

    const formattedDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "—";

    return (
        <div className="profile-page">
            {/* Header */}
            <div className="profile-header">
                <button className="profile-back-btn" onClick={() => navigate("/")}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="profile-header-title">Profile</h1>
                <div style={{ width: 36 }} />
            </div>

            {/* Card */}
            <div className="profile-card">
                {/* Avatar */}
                <div className="profile-avatar-section">
                    <div className="profile-avatar-wrapper">
                        {user?.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="profile-avatar-img"
                            />
                        ) : (
                            <div
                                className="profile-avatar-placeholder"
                                style={{ backgroundColor: getAvatarColor(user?.displayName) }}
                            >
                                {getInitials(user?.displayName)}
                            </div>
                        )}

                        {/* Upload overlay */}
                        <button
                            className="profile-avatar-overlay"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                        >
                            {uploadingAvatar ? (
                                <Loader2 size={20} className="auth-spinner" />
                            ) : (
                                <Camera size={20} />
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleAvatarUpload}
                            hidden
                        />
                    </div>

                    {/* Online status */}
                    <div className="profile-status-badge">
                        <div
                            className="profile-status-dot"
                            style={{
                                backgroundColor: isConnected ? "var(--online)" : "var(--text-muted)",
                            }}
                        />
                        <span style={{ color: isConnected ? "var(--online)" : "var(--text-muted)" }}>
                            {isConnected ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>

                {/* Info Fields */}
                <div className="profile-fields">
                    {/* Display Name */}
                    <div className="profile-field">
                        <label className="profile-field-label">
                            <User size={14} />
                            Display Name
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="profile-field-input"
                                maxLength={50}
                                autoFocus
                            />
                        ) : (
                            <p className="profile-field-value">{user?.displayName}</p>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="profile-field">
                        <label className="profile-field-label">
                            <Edit3 size={14} />
                            Bio
                        </label>
                        {isEditing ? (
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="profile-field-textarea"
                                maxLength={200}
                                rows={3}
                                placeholder="Tell something about yourself..."
                            />
                        ) : (
                            <p className="profile-field-value">
                                {user?.bio || <span style={{ color: "var(--text-muted)" }}>No bio yet</span>}
                            </p>
                        )}
                        {isEditing && (
                            <span className="profile-char-count">{bio.length}/200</span>
                        )}
                    </div>

                    {/* Read Receipts Toggle */}
                    <div className="profile-field">
                        <label className="profile-field-label">
                            <Eye size={14} />
                            Read Receipts
                        </label>
                        <div className="flex items-center justify-between">
                            <p className="text-xs" style={{ color: "var(--text-muted)", maxWidth: "220px" }}>
                                When enabled, others can see when you've read their messages
                            </p>
                            <button
                                className={`toggle-switch ${readReceipts ? 'toggle-switch-on' : 'toggle-switch-off'}`}
                                onClick={async () => {
                                    setTogglingReceipts(true);
                                    try {
                                        const newVal = !readReceipts;
                                        const { data } = await api.put("/users/settings/read-receipts", { enabled: newVal });
                                        setReadReceipts(newVal);
                                        updateUser(data.user);
                                        toast.success(`Read receipts ${newVal ? "enabled" : "disabled"}`);
                                    } catch {
                                        toast.error("Failed to update setting.");
                                    } finally {
                                        setTogglingReceipts(false);
                                    }
                                }}
                                disabled={togglingReceipts}
                            >
                                <span className="toggle-switch-thumb" />
                            </button>
                        </div>
                    </div>

                    {/* Email (read-only) */}
                    <div className="profile-field">
                        <label className="profile-field-label">
                            <Mail size={14} />
                            Email
                        </label>
                        <p className="profile-field-value">{user?.email}</p>
                    </div>

                    {/* Member Since */}
                    <div className="profile-field">
                        <label className="profile-field-label">
                            <Calendar size={14} />
                            Member Since
                        </label>
                        <p className="profile-field-value">{formattedDate}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="profile-actions">
                    {isEditing ? (
                        <>
                            <button
                                className="profile-btn profile-btn-secondary"
                                onClick={handleCancelEdit}
                                disabled={saving}
                            >
                                <X size={16} />
                                Cancel
                            </button>
                            <button
                                className="profile-btn profile-btn-primary"
                                onClick={handleSaveProfile}
                                disabled={saving}
                            >
                                {saving ? (
                                    <Loader2 size={16} className="auth-spinner" />
                                ) : (
                                    <Save size={16} />
                                )}
                                {saving ? "Saving…" : "Save Changes"}
                            </button>
                        </>
                    ) : (
                        <button
                            className="profile-btn profile-btn-primary"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit3 size={16} />
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
