import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import {
    Send, ArrowLeft, Smile, MoreVertical, ShieldOff, ShieldAlert,
    Check, CheckCheck, Users, Reply, Pencil, Trash2, X, CornerUpRight, Paperclip, FileImage, FileVideo, Expand, Loader2, Mic, Sparkles
} from "lucide-react";
import GroupInfoPanel from "./GroupInfoPanel";
import VoiceRecorder from "./VoiceRecorder";
import VoiceMessage from "./VoiceMessage";
import toast from "react-hot-toast";

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const DELETE_WINDOW_MS = 60 * 60 * 1000;

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
        markAsRead,
        // Phase 8
        replyingTo,
        setReplyingTo,
        cancelReply,
        editingMessage,
        setEditingMessage,
        cancelEdit,
        editMessage,
        deleteMessageForSelf,
        deleteMessageForEveryone,
        // Phase 9
        jumpToMessageId,
        setJumpToMessageId,
    } = useChat();
    const { isUserOnline } = useSocket();
    const [input, setInput] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const isGroup = selectedConversation?.isGroup;

    // ── Phase 10: Media states ────────────────────────────
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const fileInputRef = useRef(null);

    // ── Phase 11: Voice Notes states ──────────────────────
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);

    // ── Phase 13: AI Chatbot & Smart Replies ──────────────
    const [smartReplies, setSmartReplies] = useState([]);
    const [loadingReplies, setLoadingReplies] = useState(false);

    // ── Context menu state ────────────────────────────────
    const [contextMenu, setContextMenu] = useState(null); // { x, y, message }
    const contextMenuRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when conversation changes
    useEffect(() => {
        inputRef.current?.focus();
        if (selectedConversation?.id) {
            markAsRead();
        }
    }, [selectedConversation?.id, markAsRead]);

    // Pre-fill input when editing
    useEffect(() => {
        if (editingMessage) {
            setInput(editingMessage.content);
            inputRef.current?.focus();
        }
    }, [editingMessage]);

    // Jump to searched message
    useEffect(() => {
        if (jumpToMessageId) {
            // Slight delay to allow DOM to render if we just switched conversations
            const timer = setTimeout(() => {
                const el = document.getElementById(`msg-${jumpToMessageId}`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("msg-highlight");
                    setTimeout(() => el.classList.remove("msg-highlight"), 2000);
                }
                setJumpToMessageId(null);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [jumpToMessageId, setJumpToMessageId, messages]);

    // Check block status when conversation changes (only for DMs)
    useEffect(() => {
        const checkBlock = async () => {
            if (!selectedConversation || selectedConversation.isGroup) {
                setIsBlocked(false);
                return;
            }
            const otherUser = selectedConversation.participants?.find(
                (p) => p.user.id !== user?.id
            );
            if (otherUser?.user?.id) {
                const blocked = await checkBlockStatus(otherUser.user.id);
                setIsBlocked(blocked);
            }
        };
        checkBlock();
    }, [selectedConversation?.id, user?.id, checkBlockStatus, selectedConversation]);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close context menu on scroll
    useEffect(() => {
        const handleScroll = () => setContextMenu(null);
        const area = document.querySelector(".chat-messages-area");
        area?.addEventListener("scroll", handleScroll);
        return () => area?.removeEventListener("scroll", handleScroll);
    }, []);

    // ── Phase 13: Fetch Smart Replies ─────────────────────
    useEffect(() => {
        const fetchSmartReplies = async () => {
            if (!selectedConversation || messages.length === 0) {
                setSmartReplies([]);
                return;
            }
            const lastMessage = messages[messages.length - 1];
            const isMine = lastMessage.sender?.id === user?.id || lastMessage.senderId === user?.id;

            if (isMine) {
                setSmartReplies([]);
                return;
            }

            setLoadingReplies(true);
            try {
                const { getSmartRepliesAPI } = await import("../utils/api");
                const { data } = await getSmartRepliesAPI(selectedConversation.id);
                setSmartReplies(data.replies || []);
            } catch (err) {
                console.error("Failed to fetch smart replies:", err);
            } finally {
                setLoadingReplies(false);
            }
        };

        // Debounce fetching slightly just to not spam API when rapidly switching
        const timer = setTimeout(() => {
            fetchSmartReplies();
        }, 500);

        return () => clearTimeout(timer);
    }, [messages, selectedConversation, user?.id]);

    const handleSend = async (e) => {
        e.preventDefault();

        const hasContent = input.trim() || selectedFile;
        if (!hasContent || isBlocked || isUploading) return;

        if (editingMessage) {
            editMessage(editingMessage.id, input.trim());
            setInput("");
            return;
        }

        try {
            let attachment = null;
            if (selectedFile) {
                setIsUploading(true);
                const { uploadMediaAPI } = await import("../utils/api");
                const formData = new FormData();
                formData.append("media", selectedFile);

                const { data } = await uploadMediaAPI(formData);
                attachment = data; // { fileUrl, fileType, fileName, fileSize }
            }

            sendMessage(input.trim(), attachment);

            // Clear input and file
            setInput("");
            clearSelectedFile();
        } catch (error) {
            toast.error("Failed to send message");
            console.error("handleSend error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleVoiceSend = async (audioFile) => {
        if (isBlocked || isUploading) return;

        setIsVoiceRecording(false);
        setIsUploading(true);
        try {
            const { uploadMediaAPI } = await import("../utils/api");
            const formData = new FormData();
            formData.append("media", audioFile);

            const { data } = await uploadMediaAPI(formData);
            const attachment = data; // { fileUrl, fileType: "audio", fileName, fileSize }

            sendMessage("", attachment);
        } catch (error) {
            toast.error("Failed to send voice note");
            console.error("handleVoiceSend error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            toast.error("File size must be less than 50MB");
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (e.target.value.trim() && !editingMessage) {
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
        } catch {
            toast.error("Action failed");
        } finally {
            setBlockLoading(false);
            setShowMenu(false);
        }
    };

    // ── Context Menu ──────────────────────────────────────
    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        if (msg.isDeleted) return;

        const rect = e.currentTarget.closest(".chat-messages-area")?.getBoundingClientRect();
        const x = e.clientX - (rect?.left || 0);
        const y = e.clientY - (rect?.top || 0);

        setContextMenu({ x, y, message: msg });
    };

    const handleReply = (msg) => {
        setReplyingTo(msg);
        cancelEdit();
        setContextMenu(null);
        inputRef.current?.focus();
    };

    const handleEdit = (msg) => {
        setEditingMessage(msg);
        cancelReply();
        setContextMenu(null);
    };

    const handleDeleteForSelf = async (msg) => {
        try {
            await deleteMessageForSelf(msg.id);
            toast.success("Message deleted for you");
        } catch {
            toast.error("Failed to delete");
        }
        setContextMenu(null);
    };

    const handleDeleteForEveryone = (msg) => {
        deleteMessageForEveryone(msg.id);
        toast.success("Message deleted for everyone");
        setContextMenu(null);
    };

    const handleCancelEdit = () => {
        cancelEdit();
        setInput("");
    };

    // Scroll to a replied-to message
    const scrollToMessage = (messageId) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("msg-highlight");
            setTimeout(() => el.classList.remove("msg-highlight"), 1500);
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
    const chatAvatar = isGroup ? null : otherParticipants[0]?.user?.avatarUrl;
    const isOnline = !isGroup && otherParticipants[0]?.user?.id
        ? isUserOnline(otherParticipants[0].user.id)
        : false;
    const memberCount = selectedConversation.participants?.length || 0;

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

    const shouldShowDateSeparator = (msg, index) => {
        if (index === 0) return true;
        const prevDate = new Date(messages[index - 1].createdAt).toDateString();
        const currDate = new Date(msg.createdAt).toDateString();
        return prevDate !== currDate;
    };

    const canEdit = (msg) => {
        const isMine = msg.sender?.id === user?.id || msg.senderId === user?.id;
        if (!isMine || msg.isDeleted) return false;
        const elapsed = Date.now() - new Date(msg.createdAt).getTime();
        return elapsed <= EDIT_WINDOW_MS;
    };

    const canDeleteForEveryone = (msg) => {
        const isMine = msg.sender?.id === user?.id || msg.senderId === user?.id;
        if (!isMine || msg.isDeleted) return false;
        const elapsed = Date.now() - new Date(msg.createdAt).getTime();
        return elapsed <= DELETE_WINDOW_MS;
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: "var(--bg-chat)" }}>
            {/* ── Chat Header ──────────────────────────────── */}
            <div
                className="flex items-center gap-3 px-5 py-3 border-b"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}
            >
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
                        <img src={chatAvatar} alt={chatName} className="w-10 h-10 rounded-full object-cover" />
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
                            : isGroup
                                ? `${memberCount} members`
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
                            {isGroup && (
                                <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-fast text-left"
                                    style={{ color: "var(--text-primary)" }}
                                    onClick={() => { setShowGroupInfo(true); setShowMenu(false); }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                >
                                    <Users size={16} />
                                    Group Info
                                </button>
                            )}
                            {!isGroup && (
                                <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-fast text-left"
                                    style={{ color: isBlocked ? "var(--online)" : "var(--error)" }}
                                    onClick={handleBlock}
                                    disabled={blockLoading}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                >
                                    {isBlocked ? <ShieldOff size={16} /> : <ShieldAlert size={16} />}
                                    {blockLoading ? "Loading..." : isBlocked ? "Unblock User" : "Block User"}
                                </button>
                            )}
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
            <div className="flex-1 overflow-y-auto px-5 py-4 chat-messages-area" style={{ position: "relative" }}>
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
                            const isBot = msg.sender?.displayName === "Hey AI";
                            const showAvatar =
                                !isMine &&
                                (index === 0 || messages[index - 1]?.sender?.id !== msg.sender?.id);
                            const showDate = shouldShowDateSeparator(msg, index);

                            return (
                                <div key={msg.id} id={`msg-${msg.id}`}>
                                    {/* Date separator */}
                                    {showDate && (
                                        <div className="chat-date-separator">
                                            <span>{formatDateSeparator(msg.createdAt)}</span>
                                        </div>
                                    )}

                                    <div
                                        className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} msg-row`}
                                        style={{ marginTop: showAvatar || showDate ? "12px" : "2px" }}
                                        onContextMenu={(e) => handleContextMenu(e, msg)}
                                    >
                                        {/* Sender avatar */}
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
                                            className={`chat-bubble ${isMine ? "chat-bubble-sent" : "chat-bubble-received"} ${msg.isDeleted ? "msg-deleted-bubble" : ""}`}
                                            style={isBot && !isMine ? { border: "1px solid var(--accent)", boxShadow: "0 0 8px rgba(var(--accent-rgb), 0.2)" } : {}}
                                        >
                                            {/* Sender name (group only, received messages) */}
                                            {isGroup && !isMine && showAvatar && !msg.isDeleted && (
                                                <p className="group-sender-name" style={{ color: getAvatarColor(msg.sender?.displayName) }}>
                                                    {msg.sender?.displayName} {isBot && <Sparkles size={12} className="inline ml-1 text-yellow-500" />}
                                                </p>
                                            )}

                                            {/* Reply preview (inline) */}
                                            {msg.replyTo && !msg.isDeleted && (
                                                <div
                                                    className="reply-preview-inline"
                                                    onClick={() => scrollToMessage(msg.replyTo.id)}
                                                >
                                                    <div className="reply-preview-inline-bar" />
                                                    <div className="reply-preview-inline-content">
                                                        <span className="reply-preview-inline-name">
                                                            {msg.replyTo.sender?.displayName || "Unknown"}
                                                        </span>
                                                        <span className="reply-preview-inline-text">
                                                            {msg.replyTo.isDeleted
                                                                ? "🚫 This message was deleted"
                                                                : msg.replyTo.content?.length > 60
                                                                    ? msg.replyTo.content.substring(0, 60) + "..."
                                                                    : msg.replyTo.content || "Attached Media"}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Media Rendering */}
                                            {msg.fileUrl && !msg.isDeleted && (
                                                msg.fileType === "audio" ? (
                                                    <div className="mb-1 mt-1">
                                                        <VoiceMessage url={msg.fileUrl} isMine={isMine} />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="mb-1 rounded-lg overflow-hidden cursor-pointer"
                                                        onClick={() => setLightboxMedia(msg)}
                                                        style={{ maxWidth: "250px", maxHeight: "250px" }}
                                                    >
                                                        {msg.fileType === "video" ? (
                                                            <video src={msg.fileUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <img src={msg.fileUrl} alt={msg.fileName || "attachment"} className="w-full h-full object-cover" />
                                                        )}
                                                    </div>
                                                )
                                            )}

                                            {/* Message content or deleted placeholder */}
                                            {msg.isDeleted ? (
                                                <p className="msg-deleted-placeholder">
                                                    🚫 This message was deleted
                                                </p>
                                            ) : msg.content ? (
                                                <p className="text-sm" style={{ lineHeight: "1.45" }}>{msg.content}</p>
                                            ) : null}

                                            {/* Meta: time + edited + receipt */}
                                            <div className="chat-bubble-meta">
                                                {msg.isEdited && !msg.isDeleted && (
                                                    <span className="msg-edited-tag">edited</span>
                                                )}
                                                <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                                                {isMine && !msg.isDeleted && (
                                                    <span className={`message-receipt message-receipt-${msg.status || 'sent'}`}>
                                                        {msg.status === 'read' ? (
                                                            <CheckCheck size={14} />
                                                        ) : msg.status === 'delivered' ? (
                                                            <CheckCheck size={14} />
                                                        ) : (
                                                            <Check size={14} />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
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

                {/* ── Context Menu ─────────────────────────────── */}
                {contextMenu && (
                    <div
                        ref={contextMenuRef}
                        className="msg-context-menu"
                        style={{
                            top: contextMenu.y,
                            left: Math.min(contextMenu.x, 250),
                        }}
                    >
                        {/* Reply */}
                        <button className="msg-context-item" onClick={() => handleReply(contextMenu.message)}>
                            <Reply size={15} />
                            Reply
                        </button>

                        {/* Edit (own messages, within window) */}
                        {canEdit(contextMenu.message) && (
                            <button className="msg-context-item" onClick={() => handleEdit(contextMenu.message)}>
                                <Pencil size={15} />
                                Edit
                            </button>
                        )}

                        {/* Delete for me */}
                        <button className="msg-context-item msg-context-item-danger" onClick={() => handleDeleteForSelf(contextMenu.message)}>
                            <Trash2 size={15} />
                            Delete for me
                        </button>

                        {/* Delete for everyone (own messages, within window) */}
                        {canDeleteForEveryone(contextMenu.message) && (
                            <button className="msg-context-item msg-context-item-danger" onClick={() => handleDeleteForEveryone(contextMenu.message)}>
                                <Trash2 size={15} />
                                Delete for everyone
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Reply Preview Bar ──────────────────────────── */}
            {replyingTo && (
                <div className="reply-preview-bar">
                    <div className="reply-preview-bar-left">
                        <CornerUpRight size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                        <div className="reply-preview-bar-content">
                            <span className="reply-preview-bar-name">
                                {replyingTo.sender?.displayName || "Unknown"}
                            </span>
                            <span className="reply-preview-bar-text">
                                {replyingTo.content?.length > 80
                                    ? replyingTo.content.substring(0, 80) + "..."
                                    : replyingTo.content || "Attached Media"}
                            </span>
                        </div>
                    </div>
                    <button className="reply-preview-bar-close" onClick={cancelReply}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── Lightbox ───────────────────────────────────── */}
            {lightboxMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                    onClick={() => setLightboxMedia(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                        onClick={() => setLightboxMedia(null)}
                    >
                        <X size={24} />
                    </button>
                    <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        {lightboxMedia.fileType === "video" ? (
                            <video src={lightboxMedia.fileUrl} controls autoPlay className="max-w-full max-h-[90vh] rounded" />
                        ) : (
                            <img src={lightboxMedia.fileUrl} alt="expanded media" className="max-w-full max-h-[90vh] rounded object-contain" />
                        )}
                    </div>
                </div>
            )}

            {/* ── Edit Mode Bar ──────────────────────────────── */}
            {editingMessage && (
                <div className="edit-mode-bar">
                    <div className="edit-mode-bar-left">
                        <Pencil size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                        <span className="edit-mode-bar-label">Editing message</span>
                    </div>
                    <button className="reply-preview-bar-close" onClick={handleCancelEdit}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── File Preview Pre-Send ──────────────────────── */}
            {filePreview && (
                <div className="px-4 py-2 border-t" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}>
                    <div className="relative inline-block">
                        {selectedFile?.type.startsWith("video/") ? (
                            <div className="w-20 h-20 rounded-lg bg-black flex items-center justify-center relative overflow-hidden">
                                <FileVideo size={32} className="text-gray-400 opacity-50 absolute" />
                                <video src={filePreview} className="w-full h-full object-cover z-10" />
                            </div>
                        ) : (
                            <img src={filePreview} alt="preview" className="w-20 h-20 rounded-lg object-cover" />
                        )}
                        <button
                            onClick={clearSelectedFile}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 z-20"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Smart Replies ──────────────────────────────── */}
            {smartReplies.length > 0 && !isVoiceRecording && !loadingReplies && (
                <div className="px-4 py-3 flex flex-wrap gap-2 justify-end" style={{ backgroundColor: "var(--bg-chat)" }}>
                    {smartReplies.map((reply, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                sendMessage(reply);
                                setSmartReplies([]);
                            }}
                            className="px-3 py-1.5 rounded-full text-sm font-medium transition-fast flex items-center gap-1.5"
                            style={{
                                backgroundColor: "var(--bg-secondary)",
                                color: "var(--accent)",
                                border: "1px solid var(--border)"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--accent)";
                                e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                                e.currentTarget.style.color = "var(--accent)";
                            }}
                        >
                            <Sparkles size={14} />
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Message Input ──────────────────────────────── */}
            <div
                className="flex items-center gap-3 px-4 py-3 border-t"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}
            >
                {isVoiceRecording ? (
                    <VoiceRecorder
                        onSend={handleVoiceSend}
                        onCancel={() => setIsVoiceRecording(false)}
                    />
                ) : (
                    <form onSubmit={handleSend} className="flex flex-1 items-center gap-3">
                        <button
                            type="button"
                            className="p-2 rounded-lg transition-fast flex-shrink-0 hover:bg-black/10"
                            style={{ color: "var(--text-muted)" }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isBlocked || editingMessage || isUploading}
                        >
                            <Paperclip size={20} />
                        </button>
                        <input
                            type="file"
                            accept="image/*,video/*"
                            hidden
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />

                        <button
                            type="button"
                            className="p-2 rounded-lg transition-fast flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}
                            disabled={isBlocked || editingMessage || isUploading}
                            onClick={() => setIsVoiceRecording(true)}
                        >
                            <Mic size={20} />
                        </button>

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
                            placeholder={isBlocked ? "You blocked this user" : editingMessage ? "Edit your message..." : "Type a message..."}
                            disabled={isBlocked}
                            className="flex-1 py-2.5 px-4 rounded-xl text-sm outline-none"
                            style={{
                                backgroundColor: "var(--bg-input)",
                                color: "var(--text-primary)",
                                border: editingMessage ? "1px solid var(--accent)" : "1px solid var(--border)",
                                opacity: isBlocked ? 0.5 : 1,
                            }}
                        />

                        <button
                            type="submit"
                            disabled={(!input.trim() && !selectedFile) || isBlocked || isUploading}
                            className="p-2.5 rounded-xl transition-fast flex-shrink-0"
                            style={{
                                backgroundColor: (input.trim() || selectedFile) && !isBlocked ? "var(--accent)" : "var(--bg-input)",
                                color: (input.trim() || selectedFile) && !isBlocked ? "#fff" : "var(--text-muted)",
                                cursor: (input.trim() || selectedFile) && !isBlocked && !isUploading ? "pointer" : "default",
                            }}
                        >
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : editingMessage ? <Check size={18} /> : <Send size={18} />}
                        </button>
                    </form>
                )}
            </div>

            {/* Group Info Panel */}
            {showGroupInfo && isGroup && (
                <GroupInfoPanel
                    conversation={selectedConversation}
                    onClose={() => setShowGroupInfo(false)}
                />
            )}
        </div>
    );
};

export default ChatWindow;
