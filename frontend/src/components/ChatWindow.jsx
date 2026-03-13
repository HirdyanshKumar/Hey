import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import {
    Send, ArrowLeft, Smile, MoreVertical, ShieldOff, ShieldAlert,
    Check, CheckCheck, Users, Reply, Pencil, Trash2, X, CornerUpRight, Paperclip, FileImage, FileVideo, Expand, Loader2, Mic, Sparkles,
    Wand2, FileText, Languages
} from "lucide-react";
import GroupInfoPanel from "./GroupInfoPanel";
import VoiceRecorder from "./VoiceRecorder";
import VoiceMessage from "./VoiceMessage";
import WritingToolsModal from "./WritingToolsModal";
import ChatSummaryModal from "./ChatSummaryModal";
import { translateMessageAPI } from "../utils/api";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

import { Avatar } from "./ui/avatar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { cn } from "../lib/utils";

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
        replyingTo,
        setReplyingTo,
        cancelReply,
        editingMessage,
        setEditingMessage,
        cancelEdit,
        editMessage,
        deleteMessageForSelf,
        deleteMessageForEveryone,
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

    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const fileInputRef = useRef(null);

    const [isVoiceRecording, setIsVoiceRecording] = useState(false);

    const [smartReplies, setSmartReplies] = useState([]);
    const [loadingReplies, setLoadingReplies] = useState(false);

    const [showWritingTools, setShowWritingTools] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [translations, setTranslations] = useState({});

    const [contextMenu, setContextMenu] = useState(null);
    const contextMenuRef = useRef(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
        setInput("");
        clearSelectedFile();
        setReplyingTo(null);
        if (selectedConversation?.id) {
            markAsRead();
        }
    }, [selectedConversation?.id, markAsRead]);

    useEffect(() => {
        if (editingMessage) {
            setInput(editingMessage.content);
            inputRef.current?.focus();
        }
    }, [editingMessage]);

    useEffect(() => {
        if (jumpToMessageId) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`msg-${jumpToMessageId}`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("bg-surface-hover", "transition-colors", "duration-1000");
                    setTimeout(() => el.classList.remove("bg-surface-hover"), 2000);
                }
                setJumpToMessageId(null);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [jumpToMessageId, setJumpToMessageId, messages]);

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

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                setContextMenu(null);
            }
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleScroll = () => setContextMenu(null);
        const area = document.querySelector(".chat-messages-area");
        area?.addEventListener("scroll", handleScroll);
        return () => area?.removeEventListener("scroll", handleScroll);
    }, []);

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
                attachment = data;
            }

            sendMessage(input.trim(), attachment);

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
            const attachment = data;

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

    const scrollToMessage = (messageId) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("bg-surface-hover", "transition-colors", "duration-1000");
            setTimeout(() => el.classList.remove("bg-surface-hover"), 1500);
        }
    };

    const handleTranslate = async (msg) => {
        setContextMenu(null);
        const msgId = msg.id;
        if (translations[msgId]?.text) {
            setTranslations(prev => ({
                ...prev,
                [msgId]: { ...prev[msgId], visible: !prev[msgId].visible }
            }));
            return;
        }

        setTranslations(prev => ({
            ...prev,
            [msgId]: { text: "", loading: true, visible: true }
        }));

        try {
            const targetLang = user?.preferredLanguage || "en";
            const languageNames = {
                en: "English", hi: "Hindi", es: "Spanish", fr: "French",
                de: "German", ja: "Japanese", zh: "Chinese", ar: "Arabic",
                pt: "Portuguese", ko: "Korean", ru: "Russian", it: "Italian"
            };
            const { data } = await translateMessageAPI(msg.content, languageNames[targetLang] || "English");
            setTranslations(prev => ({
                ...prev,
                [msgId]: { text: data.translatedText, loading: false, visible: true }
            }));
        } catch {
            toast.error("Translation failed");
            setTranslations(prev => {
                const copy = { ...prev };
                delete copy[msgId];
                return copy;
            });
        }
    };

    if (!selectedConversation) return null;

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

    const typingUserIds = getTypingUsers(selectedConversation.id);
    const typingNames = typingUserIds.map((id) => {
        const participant = selectedConversation.participants?.find((p) => p.user.id === id);
        return participant?.user?.displayName || "Someone";
    });

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
        <div className="flex h-full flex-col bg-surface-bg">
            {/* ── Chat Header ──────────────────────────────── */}
            <div className="flex items-center gap-3 border-b border-border bg-surface-panel px-5 py-3">
                <button
                    className="rounded-lg p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary md:hidden"
                    onClick={onBack}
                >
                    <ArrowLeft size={20} />
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                    <Avatar name={chatName} src={chatAvatar} size="md" />
                    {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-bg bg-status-success" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-semibold text-content-primary">
                        {chatName}
                    </h3>
                    <p className={cn("text-xs", isOnline ? "text-status-success" : "text-content-muted")}>
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
                        className="rounded-lg p-2 text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                        onClick={() => setShowMenu(!showMenu)}
                    >
                        <MoreVertical size={18} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-lg border border-border bg-surface-elevated py-1 shadow-elevated animate-fade-in">
                            {isGroup && (
                                <button
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-content-primary transition-colors hover:bg-surface-hover"
                                    onClick={() => { setShowGroupInfo(true); setShowMenu(false); }}
                                >
                                    <Users size={16} /> Group Info
                                </button>
                            )}
                            <button
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-content-primary transition-colors hover:bg-surface-hover"
                                onClick={() => { setShowSummary(true); setShowMenu(false); }}
                            >
                                <FileText size={16} /> Summarize Chat
                            </button>
                            {!isGroup && (
                                <button
                                    className={cn("flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-hover", isBlocked ? "text-status-success" : "text-status-error")}
                                    onClick={handleBlock}
                                    disabled={blockLoading}
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
                <div className="flex items-center justify-center gap-2 border-b border-border bg-status-error/10 px-4 py-2 text-sm text-status-error">
                    <ShieldAlert size={14} />
                    You have blocked this user. Unblock to continue chatting.
                </div>
            )}

            {/* ── Messages Area ─────────────────────────────── */}
            <div className="chat-messages-area relative flex-1 overflow-y-auto px-5 py-4">
                {loadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                        <Spinner />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <p className="text-sm text-content-muted">
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
                                        <div className="my-4 flex items-center justify-center">
                                            <span className="rounded-full border border-border bg-surface-elevated/50 px-3 py-1 text-[11px] font-semibold tracking-wider text-content-muted">
                                                {formatDateSeparator(msg.createdAt)}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        className={cn("flex flex-row items-end gap-2", isMine && "flex-row-reverse", (showAvatar || showDate) ? "mt-3" : "mt-0.5")}
                                        onContextMenu={(e) => handleContextMenu(e, msg)}
                                    >
                                        {/* Sender avatar */}
                                        <div className="w-7 shrink-0">
                                            {showAvatar && !isMine && (
                                                <Avatar name={msg.sender?.displayName} src={msg.sender?.avatarUrl} size="sm" />
                                            )}
                                        </div>

                                        {/* Message bubble */}
                                        <div
                                            className={cn(
                                                "relative max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[65%]",
                                                msg.isDeleted
                                                    ? "border border-border bg-surface-bg text-content-muted italic opacity-70"
                                                    : isMine
                                                    ? "rounded-br-sm bg-accent text-white"
                                                    : "rounded-bl-sm border border-border bg-surface-elevated text-content-primary",
                                                isBot && !isMine && "border-accent shadow-[0_0_8px_rgba(109,40,217,0.2)]"
                                            )}
                                        >
                                            {/* Sender name (group only, received messages) */}
                                            {isGroup && !isMine && showAvatar && !msg.isDeleted && (
                                                <p className="mb-1 text-xs font-semibold text-content-secondary">
                                                    {msg.sender?.displayName} {isBot && <Sparkles size={12} className="ml-1 inline text-yellow-500" />}
                                                </p>
                                            )}

                                            {/* Reply preview (inline) */}
                                            {msg.replyTo && !msg.isDeleted && (
                                                <div
                                                    className="mb-1.5 flex cursor-pointer items-stretch overflow-hidden rounded-lg bg-black/10 text-xs transition-colors hover:bg-black/15"
                                                    onClick={() => scrollToMessage(msg.replyTo.id)}
                                                >
                                                    <div className={cn("w-1 shrink-0", isMine ? "bg-white/50" : "bg-accent/50")} />
                                                    <div className="flex flex-col px-2 py-1.5 opacity-80">
                                                        <span className="font-semibold">
                                                            {msg.replyTo.sender?.displayName || "Unknown"}
                                                        </span>
                                                        <span className="truncate">
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
                                                        className="mb-1 cursor-pointer overflow-hidden rounded-lg"
                                                        onClick={() => setLightboxMedia(msg)}
                                                        style={{ maxWidth: "250px", maxHeight: "250px" }}
                                                    >
                                                        {msg.fileType === "video" ? (
                                                            <video src={msg.fileUrl} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <img src={msg.fileUrl} alt={msg.fileName || "attachment"} className="h-full w-full object-cover" />
                                                        )}
                                                    </div>
                                                )
                                            )}

                                            {/* Message content or deleted placeholder */}
                                            {msg.isDeleted ? (
                                                <p>🚫 This message was deleted</p>
                                            ) : msg.content ? (
                                                <p className="text-sm leading-relaxed">
                                                    {translations[msg.id]?.visible && !translations[msg.id]?.loading
                                                        ? translations[msg.id].text
                                                        : msg.content}
                                                </p>
                                            ) : null}

                                            {/* Meta: time + edited + receipt */}
                                            <div className={cn("mt-1 flex items-center justify-end gap-1.5 text-[10px]", isMine ? "text-white/70" : "text-content-muted")}>
                                                {!isMine && !msg.isDeleted && msg.content && !translations[msg.id] && (
                                                    <button 
                                                        onClick={() => handleTranslate(msg)}
                                                        className="mr-2 flex items-center gap-1 font-semibold opacity-60 transition-opacity hover:opacity-100"
                                                    >
                                                        <Languages size={10} /> Translate
                                                    </button>
                                                )}
                                                {msg.isEdited && !msg.isDeleted && (
                                                    <span className="italic">edited</span>
                                                )}
                                                <span>{formatTime(msg.createdAt)}</span>
                                                {isMine && !msg.isDeleted && (
                                                    <span>
                                                        {msg.status === 'read' ? (
                                                            <CheckCheck size={14} className="text-white" />
                                                        ) : msg.status === 'delivered' ? (
                                                            <CheckCheck size={14} />
                                                        ) : (
                                                            <Check size={14} />
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Phase 14: Translation */}
                                            {translations[msg.id] && (
                                                <div className="mt-2 border-t border-black/10 pt-1">
                                                    {translations[msg.id].loading ? (
                                                        <div className="flex gap-1 items-center text-[10px] text-content-muted opacity-80">
                                                            <Loader2 size={12} className="animate-spin" />
                                                            <span>Translating...</span>
                                                        </div>
                                                    ) : translations[msg.id].visible ? (
                                                        <button
                                                            className={cn("flex items-center gap-1 text-[10px] opacity-70 transition-opacity hover:opacity-100", isMine ? "text-white" : "text-accent")}
                                                            onClick={() => setTranslations(prev => ({
                                                                ...prev,
                                                                [msg.id]: { ...prev[msg.id], visible: false }
                                                            }))}
                                                        >
                                                            <Languages size={11} /> Show original
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className={cn("flex items-center gap-1 text-[10px] opacity-70 transition-opacity hover:opacity-100", isMine ? "text-white" : "text-accent")}
                                                            onClick={() => setTranslations(prev => ({
                                                                ...prev,
                                                                [msg.id]: { ...prev[msg.id], visible: true }
                                                            }))}
                                                        >
                                                            <Languages size={11} /> Show translation
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Typing indicator */}
                        {typingNames.length > 0 && (
                            <div className="mt-2 flex flex-row items-end gap-2">
                                <div className="w-7 shrink-0" />
                                <div className="flex h-8 items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-surface-elevated px-3 py-2 text-content-muted">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-content-muted" style={{ animationDelay: '0ms' }} />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-content-muted" style={{ animationDelay: '150ms' }} />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-content-muted" style={{ animationDelay: '300ms' }} />
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
                        className="fixed z-50 flex w-48 flex-col gap-0.5 rounded-xl border border-border bg-surface-elevated p-1 shadow-elevated animate-fade-in"
                        style={{
                            top: contextMenu.y,
                            left: Math.min(contextMenu.x, window.innerWidth - 200),
                        }}
                    >
                        {/* Reply */}
                        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-content-primary transition-colors hover:bg-surface-hover" onClick={() => handleReply(contextMenu.message)}>
                            <Reply size={15} /> Reply
                        </button>

                        {/* Phase 14: Translate */}
                        {contextMenu.message.content && (
                            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-content-primary transition-colors hover:bg-surface-hover" onClick={() => handleTranslate(contextMenu.message)}>
                                <Languages size={15} />
                                {translations[contextMenu.message.id]?.text ? "Toggle Translation" : "Translate"}
                            </button>
                        )}

                        {/* Edit (own messages, within window) */}
                        {canEdit(contextMenu.message) && (
                            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-content-primary transition-colors hover:bg-surface-hover" onClick={() => handleEdit(contextMenu.message)}>
                                <Pencil size={15} /> Edit
                            </button>
                        )}

                        {/* Delete for me */}
                        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-status-error transition-colors hover:bg-status-error/10" onClick={() => handleDeleteForSelf(contextMenu.message)}>
                            <Trash2 size={15} /> Delete for me
                        </button>

                        {/* Delete for everyone (own messages, within window) */}
                        {canDeleteForEveryone(contextMenu.message) && (
                            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-status-error transition-colors hover:bg-status-error/10" onClick={() => handleDeleteForEveryone(contextMenu.message)}>
                                <Trash2 size={15} /> Delete for everyone
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Reply Preview Bar ──────────────────────────── */}
            {replyingTo && (
                <div className="flex items-center justify-between border-t border-border bg-surface-bg px-4 py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CornerUpRight size={16} className="shrink-0 text-accent" />
                        <div className="flex flex-col overflow-hidden text-sm">
                            <span className="font-semibold text-content-primary">
                                {replyingTo.sender?.displayName || "Unknown"}
                            </span>
                            <span className="truncate text-content-secondary">
                                {replyingTo.content?.length > 80
                                    ? replyingTo.content.substring(0, 80) + "..."
                                    : replyingTo.content || "Attached Media"}
                            </span>
                        </div>
                    </div>
                    <button className="rounded-lg p-1.5 text-content-muted hover:bg-surface-hover" onClick={cancelReply}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── Lightbox ───────────────────────────────────── */}
            {lightboxMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in"
                    onClick={() => setLightboxMedia(null)}
                >
                    <button
                        className="absolute right-4 top-4 p-2 text-white/50 hover:text-white"
                        onClick={() => setLightboxMedia(null)}
                    >
                        <X size={24} />
                    </button>
                    <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                        {lightboxMedia.fileType === "video" ? (
                            <video src={lightboxMedia.fileUrl} controls autoPlay className="max-h-[90vh] max-w-full rounded-xl" />
                        ) : (
                            <img src={lightboxMedia.fileUrl} alt="expanded media" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
                        )}
                    </div>
                </div>
            )}

            {/* ── Edit Mode Bar ──────────────────────────────── */}
            {editingMessage && (
                <div className="flex items-center justify-between border-t border-border bg-surface-bg px-4 py-2">
                    <div className="flex items-center gap-2">
                        <Pencil size={16} className="shrink-0 text-accent" />
                        <span className="text-sm font-medium text-content-primary">Editing message</span>
                    </div>
                    <button className="rounded-lg p-1.5 text-content-muted hover:bg-surface-hover" onClick={handleCancelEdit}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── File Preview Pre-Send ──────────────────────── */}
            {filePreview && (
                <div className="border-t border-border bg-surface-panel px-4 py-2">
                    <div className="relative inline-block">
                        {selectedFile?.type.startsWith("video/") ? (
                            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-black">
                                <FileVideo size={32} className="absolute text-white/50" />
                                <video src={filePreview} className="z-10 h-full w-full object-cover" />
                            </div>
                        ) : (
                            <img src={filePreview} alt="preview" className="h-20 w-20 rounded-lg object-cover" />
                        )}
                        <button
                            onClick={clearSelectedFile}
                            className="absolute -right-2 -top-2 z-20 rounded-full bg-status-error p-1 text-white shadow-md hover:bg-red-600"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Smart Replies ──────────────────────────────── */}
            {smartReplies.length > 0 && !isVoiceRecording && !loadingReplies && (
                <div className="flex flex-wrap justify-end gap-2 bg-surface-bg px-4 py-3">
                    {smartReplies.map((reply, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                sendMessage(reply);
                                setSmartReplies([]);
                            }}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white"
                        >
                            <Sparkles size={14} />
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Message Input ──────────────────────────────── */}
            <div className="flex items-center gap-3 border-t border-border bg-surface-panel px-4 py-3">
                {isVoiceRecording ? (
                    <VoiceRecorder
                        onSend={handleVoiceSend}
                        onCancel={() => setIsVoiceRecording(false)}
                    />
                ) : (
                    <form onSubmit={handleSend} className="flex flex-1 items-center gap-3">
                        <button
                            type="button"
                            className="shrink-0 rounded-lg p-2 text-content-muted transition-colors hover:bg-surface-hover"
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
                            className="shrink-0 rounded-lg p-2 text-content-muted transition-colors hover:bg-surface-hover"
                            disabled={isBlocked || editingMessage || isUploading}
                            onClick={() => setIsVoiceRecording(true)}
                        >
                            <Mic size={20} />
                        </button>

                        <button
                            type="button"
                            className="shrink-0 rounded-lg p-2 text-accent transition-colors hover:bg-surface-hover"
                            disabled={isBlocked || isUploading}
                            onClick={() => setShowWritingTools(true)}
                            title="AI Writing Tools"
                        >
                            <Wand2 size={20} />
                        </button>

                        <div className="relative flex items-center justify-center" ref={emojiPickerRef}>
                            <button
                                type="button"
                                className="shrink-0 rounded-lg p-2 text-content-muted transition-colors hover:bg-surface-hover"
                                onClick={() => setShowEmojiPicker((prev) => !prev)}
                                disabled={isBlocked || isUploading}
                            >
                                <Smile size={20} />
                            </button>

                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-3 z-50 animate-fade-in shadow-elevated rounded-lg overflow-hidden border border-border">
                                    <EmojiPicker
                                        theme="dark"
                                        onEmojiClick={(emojiData) => {
                                            setInput((prev) => prev + emojiData.emoji);
                                        }}
                                        style={{ backgroundColor: "var(--bg-surface-panel)", border: "none" }}
                                    />
                                </div>
                            )}
                        </div>

                        <Input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder={isBlocked ? "You blocked this user" : editingMessage ? "Edit your message..." : "Type a message..."}
                            disabled={isBlocked}
                            className={cn("flex-1", isBlocked && "opacity-50")}
                        />

                        <Button
                            type="submit"
                            disabled={(!input.trim() && !selectedFile) || isBlocked || isUploading}
                            className="shrink-0"
                        >
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : editingMessage ? <Check size={18} /> : <Send size={18} />}
                        </Button>
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

            {/* Phase 14: Writing Tools Modal */}
            <WritingToolsModal
                isOpen={showWritingTools}
                onClose={() => setShowWritingTools(false)}
                onUseText={(text) => setInput(text)}
                initialText={input}
            />

            {/* Phase 14: Chat Summary Modal */}
            <ChatSummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                conversationId={selectedConversation?.id}
            />
        </div>
    );
};

export default ChatWindow;
