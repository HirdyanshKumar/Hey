import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import api, { updatePreferredLanguageAPI } from "../utils/api";
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
    Languages,
} from "lucide-react";

import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";

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
    const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || "en");
    const [savingLanguage, setSavingLanguage] = useState(false);

    const languageOptions = [
        { code: "en", name: "English" },
        { code: "hi", name: "Hindi" },
        { code: "es", name: "Spanish" },
        { code: "fr", name: "French" },
        { code: "de", name: "German" },
        { code: "ja", name: "Japanese" },
        { code: "zh", name: "Chinese" },
        { code: "ar", name: "Arabic" },
        { code: "pt", name: "Portuguese" },
        { code: "ko", name: "Korean" },
        { code: "ru", name: "Russian" },
        { code: "it", name: "Italian" },
    ];

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
        <div className="flex min-h-screen w-full flex-col items-center bg-surface-bg p-4 overflow-y-auto">
            {/* Header */}
            <div className="flex w-full max-w-lg items-center justify-between pb-6 pt-2">
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-elevated text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => navigate("/")}
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-xl font-bold text-content-primary">Profile</h1>
                <div className="w-9" />
            </div>

            {/* Card */}
            <Card className="w-full max-w-lg animate-fade-in p-8">
                {/* Avatar Section */}
                <div className="mb-8 flex flex-col items-center gap-3">
                    <div className="group relative h-24 w-24">
                        <Avatar
                            name={user?.displayName || "?"}
                            src={user?.avatarUrl}
                            className="h-24 w-24 border-[3px] border-border text-3xl"
                        />
                        <button
                            className="absolute inset-0 flex items-center justify-center rounded-full border-none bg-black/50 text-white opacity-0 transition-opacity disabled:opacity-50 group-hover:opacity-100"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                        >
                            {uploadingAvatar ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <Camera size={24} />
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
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <div
                            className={`h-2 w-2 rounded-full ${isConnected ? "bg-status-success" : "bg-content-muted"}`}
                        />
                        <span className={isConnected ? "text-status-success" : "text-content-muted"}>
                            {isConnected ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>

                {/* Info Fields */}
                <div className="mb-6 flex flex-col gap-6">
                    {/* Display Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                            <User size={14} />
                            Display Name
                        </label>
                        {isEditing ? (
                            <Input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                maxLength={50}
                                autoFocus
                            />
                        ) : (
                            <div className="flex min-h-10 items-center rounded-md bg-surface-elevated px-3 py-2 text-sm text-content-primary">
                                <p>{user?.displayName}</p>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                            <Edit3 size={14} />
                            Bio
                        </label>
                        {isEditing ? (
                            <>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="flex w-full resize-y rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-content-primary transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                                    maxLength={200}
                                    rows={3}
                                    placeholder="Tell something about yourself..."
                                />
                                <span className="mt-1 block text-right text-[11px] text-content-muted">
                                    {bio.length}/200
                                </span>
                            </>
                        ) : (
                            <div className="flex min-h-10 items-center rounded-md bg-surface-elevated px-3 py-2 text-sm text-content-primary">
                                <p>
                                    {user?.bio || <span className="text-content-muted">No bio yet</span>}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Read Receipts */}
                    <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                            <Eye size={14} />
                            Read Receipts
                        </label>
                        <div className="flex items-center justify-between rounded-md bg-surface-elevated px-3 py-3">
                            <p className="max-w-[220px] text-xs text-content-muted">
                                When enabled, others can see when you've read their messages
                            </p>
                            <button
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg disabled:cursor-not-allowed disabled:opacity-50 ${readReceipts ? "bg-accent" : "bg-border-strong"}`}
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
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${readReceipts ? "translate-x-4" : "translate-x-0"}`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Preferred Language */}
                    <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                            <Languages size={14} />
                            Preferred Language
                        </label>
                        <div className="flex items-center justify-between rounded-md bg-surface-elevated px-3 py-2.5">
                            <p className="max-w-[220px] text-xs text-content-muted">
                                Messages will be translated to this language
                            </p>
                            <select
                                className="rounded-md border border-border bg-surface-bg px-2 py-1 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                value={preferredLanguage}
                                disabled={savingLanguage}
                                onChange={async (e) => {
                                    const newLang = e.target.value;
                                    setSavingLanguage(true);
                                    try {
                                        const { data } = await updatePreferredLanguageAPI(newLang);
                                        setPreferredLanguage(newLang);
                                        updateUser(data.user);
                                        toast.success(`Language set to ${languageOptions.find(l => l.code === newLang)?.name}`);
                                    } catch {
                                        toast.error("Failed to update language.");
                                    } finally {
                                        setSavingLanguage(false);
                                    }
                                }}
                            >
                                {languageOptions.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                            <Mail size={14} />
                            Email
                        </label>
                        <div className="flex items-center rounded-md bg-surface-elevated px-3 py-2.5 text-sm text-content-primary">
                            <p>{user?.email}</p>
                        </div>
                    </div>

                    {/* Member Since */}
                    <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-content-muted">
                            <Calendar size={14} />
                            Member Since
                        </label>
                        <div className="flex items-center rounded-md bg-surface-elevated px-3 py-2.5 text-sm text-content-primary">
                            <p>{formattedDate}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    {isEditing ? (
                        <>
                            <Button variant="secondary" onClick={handleCancelEdit} disabled={saving}>
                                <X size={16} />
                                Cancel
                            </Button>
                            <Button onClick={handleSaveProfile} disabled={saving}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? "Saving…" : "Save Changes"}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>
                            <Edit3 size={16} />
                            Edit Profile
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default ProfilePage;
