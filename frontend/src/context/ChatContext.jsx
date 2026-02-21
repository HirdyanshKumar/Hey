import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import api from "../utils/api";

const ChatContext = createContext(null);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});
    const selectedConvIdRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    // ── Phase 8: Reply & Edit state ───────────────────────
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);

    const cancelReply = useCallback(() => setReplyingTo(null), []);
    const cancelEdit = useCallback(() => setEditingMessage(null), []);

    // Fetch all conversations
    const fetchConversations = useCallback(async () => {
        try {
            setLoadingConversations(true);
            const { data } = await api.get("/conversations");
            setConversations(data.conversations);
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    // Select a conversation and load its messages
    const selectConversation = useCallback(async (conversationId) => {
        if (!conversationId) {
            setSelectedConversation(null);
            setMessages([]);
            selectedConvIdRef.current = null;
            return;
        }

        try {
            setLoadingMessages(true);
            const { data } = await api.get(`/conversations/${conversationId}`);
            setSelectedConversation(data.conversation);
            setMessages(data.conversation.messages || []);
            selectedConvIdRef.current = conversationId;

            // Reset reply/edit state when switching conversations
            setReplyingTo(null);
            setEditingMessage(null);

            // Join the conversation room
            if (socket && isConnected) {
                socket.emit("join:conversation", { conversationId });
                socket.emit("message:read", { conversationId });
            }
        } catch (error) {
            console.error("Failed to fetch conversation:", error);
        } finally {
            setLoadingMessages(false);
        }
    }, [socket, isConnected]);

    // Mark current conversation as read
    const markAsRead = useCallback(() => {
        if (!socket || !isConnected || !selectedConvIdRef.current) return;
        socket.emit("message:read", { conversationId: selectedConvIdRef.current });
    }, [socket, isConnected]);

    // Create or open a conversation with a user
    const createConversation = useCallback(async (participantId) => {
        try {
            const { data } = await api.post("/conversations", { participantId });
            const conv = data.conversation;

            setConversations((prev) => {
                const exists = prev.find((c) => c.id === conv.id);
                if (exists) return prev;
                return [conv, ...prev];
            });

            await selectConversation(conv.id);

            if (socket && isConnected) {
                socket.emit("join:conversation", { conversationId: conv.id });
            }

            return conv;
        } catch (error) {
            console.error("Failed to create conversation:", error);
            throw error;
        }
    }, [selectConversation, socket, isConnected]);

    // Send a message via Socket.IO (supports replyToId)
    const sendMessage = useCallback((content) => {
        if (!socket || !isConnected || !selectedConvIdRef.current) return;

        const payload = {
            conversationId: selectedConvIdRef.current,
            content,
        };

        if (replyingTo) {
            payload.replyToId = replyingTo.id;
        }

        socket.emit("send:message", payload);

        // Clear reply state after sending
        setReplyingTo(null);
        // Stop typing when sending
        stopTyping();
    }, [socket, isConnected, replyingTo]);

    // ── Phase 8: Edit message ─────────────────────────────
    const editMessage = useCallback(async (messageId, content) => {
        if (!socket || !isConnected) return;

        // Real-time via socket
        socket.emit("message:edit", { messageId, content });

        // Clear edit state
        setEditingMessage(null);
    }, [socket, isConnected]);

    // ── Phase 8: Delete message for self (HTTP only) ──────
    const deleteMessageForSelf = useCallback(async (messageId) => {
        try {
            await api.delete(`/messages/${messageId}/self`);
            // Remove from local state immediately
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
        } catch (error) {
            console.error("Failed to delete message for self:", error);
            throw error;
        }
    }, []);

    // ── Phase 8: Delete message for everyone (socket) ─────
    const deleteMessageForEveryone = useCallback((messageId) => {
        if (!socket || !isConnected) return;
        socket.emit("message:deleteForEveryone", { messageId });
    }, [socket, isConnected]);

    // Typing indicators
    const startTyping = useCallback(() => {
        if (!socket || !isConnected || !selectedConvIdRef.current || isTypingRef.current) return;

        isTypingRef.current = true;
        socket.emit("typing:start", { conversationId: selectedConvIdRef.current });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 3000);
    }, [socket, isConnected]);

    const stopTyping = useCallback(() => {
        if (!socket || !isConnected || !selectedConvIdRef.current) return;

        if (isTypingRef.current) {
            isTypingRef.current = false;
            socket.emit("typing:stop", { conversationId: selectedConvIdRef.current });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    }, [socket, isConnected]);

    const resetTypingTimeout = useCallback(() => {
        if (!isTypingRef.current) {
            startTyping();
            return;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 3000);
    }, [startTyping, stopTyping]);

    // Block / Unblock
    const blockUser = useCallback(async (targetUserId) => {
        try {
            await api.post(`/users/block/${targetUserId}`);
            return true;
        } catch (error) {
            console.error("Failed to block user:", error);
            return false;
        }
    }, []);

    const unblockUser = useCallback(async (targetUserId) => {
        try {
            await api.delete(`/users/block/${targetUserId}`);
            return true;
        } catch (error) {
            console.error("Failed to unblock user:", error);
            return false;
        }
    }, []);

    const checkBlockStatus = useCallback(async (targetUserId) => {
        try {
            const { data } = await api.get("/users/blocked");
            return data.users.some((u) => u.id === targetUserId);
        } catch (error) {
            return false;
        }
    }, []);

    // ── Group Functions ───────────────────────────────────
    const createGroup = useCallback(async (name, description, memberIds) => {
        try {
            const { data } = await api.post("/groups", { name, description, memberIds });
            const conv = data.conversation;
            setConversations((prev) => [conv, ...prev]);
            await selectConversation(conv.id);
            if (socket && isConnected) {
                socket.emit("group:joinRoom", { conversationId: conv.id });
            }
            return conv;
        } catch (error) {
            console.error("Failed to create group:", error);
            throw error;
        }
    }, [selectConversation, socket, isConnected]);

    const updateGroup = useCallback(async (groupId, updateData) => {
        try {
            const { data } = await api.put(`/groups/${groupId}`, updateData);
            setSelectedConversation(data.conversation);
            setConversations((prev) => prev.map((c) => c.id === groupId ? { ...c, ...data.conversation } : c));
            return data.conversation;
        } catch (error) {
            console.error("Failed to update group:", error);
            throw error;
        }
    }, []);

    const addMembers = useCallback(async (groupId, memberIds) => {
        try {
            const { data } = await api.post(`/groups/${groupId}/members`, { memberIds });
            setSelectedConversation(data.conversation);
            setConversations((prev) => prev.map((c) => c.id === groupId ? { ...c, ...data.conversation } : c));
            return data.conversation;
        } catch (error) {
            console.error("Failed to add members:", error);
            throw error;
        }
    }, []);

    const removeMember = useCallback(async (groupId, targetUserId) => {
        try {
            await api.delete(`/groups/${groupId}/members/${targetUserId}`);
            setSelectedConversation((prev) => {
                if (!prev || prev.id !== groupId) return prev;
                return { ...prev, participants: prev.participants.filter((p) => p.user.id !== targetUserId) };
            });
            return true;
        } catch (error) {
            console.error("Failed to remove member:", error);
            throw error;
        }
    }, []);

    const promoteMember = useCallback(async (groupId, targetUserId) => {
        try {
            await api.put(`/groups/${groupId}/members/${targetUserId}/promote`);
            setSelectedConversation((prev) => {
                if (!prev || prev.id !== groupId) return prev;
                return {
                    ...prev,
                    participants: prev.participants.map((p) =>
                        p.user.id === targetUserId ? { ...p, role: "admin" } : p
                    ),
                };
            });
            return true;
        } catch (error) {
            console.error("Failed to promote member:", error);
            throw error;
        }
    }, []);

    const demoteMember = useCallback(async (groupId, targetUserId) => {
        try {
            await api.put(`/groups/${groupId}/members/${targetUserId}/demote`);
            setSelectedConversation((prev) => {
                if (!prev || prev.id !== groupId) return prev;
                return {
                    ...prev,
                    participants: prev.participants.map((p) =>
                        p.user.id === targetUserId ? { ...p, role: "member" } : p
                    ),
                };
            });
            return true;
        } catch (error) {
            console.error("Failed to demote member:", error);
            throw error;
        }
    }, []);

    const leaveGroup = useCallback(async (groupId) => {
        try {
            await api.post(`/groups/${groupId}/leave`);
            if (socket && isConnected) {
                socket.emit("group:leaveRoom", { conversationId: groupId });
            }
            setConversations((prev) => prev.filter((c) => c.id !== groupId));
            if (selectedConvIdRef.current === groupId) {
                setSelectedConversation(null);
                setMessages([]);
                selectedConvIdRef.current = null;
            }
            return true;
        } catch (error) {
            console.error("Failed to leave group:", error);
            throw error;
        }
    }, [socket, isConnected]);

    const deleteGroup = useCallback(async (groupId) => {
        try {
            await api.delete(`/groups/${groupId}`);
            setConversations((prev) => prev.filter((c) => c.id !== groupId));
            if (selectedConvIdRef.current === groupId) {
                setSelectedConversation(null);
                setMessages([]);
                selectedConvIdRef.current = null;
            }
            return true;
        } catch (error) {
            console.error("Failed to delete group:", error);
            throw error;
        }
    }, []);

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Listen for new messages, typing events, status updates, edits, deletions
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = ({ conversationId, message }) => {
            if (selectedConvIdRef.current === conversationId) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === message.id)) return prev;
                    return [...prev, message];
                });

                if (message.senderId !== user?.id && message.sender?.id !== user?.id) {
                    socket.emit("message:delivered", { messageIds: [message.id], conversationId });
                    socket.emit("message:read", { conversationId });
                }
            } else {
                if (message.senderId !== user?.id && message.sender?.id !== user?.id) {
                    socket.emit("message:delivered", { messageIds: [message.id], conversationId });
                }
            }

            setConversations((prev) => {
                const updated = prev.map((c) => {
                    if (c.id === conversationId) {
                        return { ...c, messages: [message], updatedAt: message.createdAt };
                    }
                    return c;
                });
                return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            });
        };

        const handleStatusUpdate = ({ conversationId, messageIds, status, readAt }) => {
            if (selectedConvIdRef.current === conversationId) {
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (messageIds.includes(msg.id)) {
                            return { ...msg, status, ...(readAt ? { readAt } : {}) };
                        }
                        return msg;
                    })
                );
            }
        };

        // ── Phase 8: Handle edited messages ──────────────
        const handleMessageEdited = ({ conversationId, message: updatedMsg }) => {
            if (selectedConvIdRef.current === conversationId) {
                setMessages((prev) =>
                    prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
                );
            }
            // Also update sidebar last message if it was the last one
            setConversations((prev) =>
                prev.map((c) => {
                    if (c.id === conversationId && c.messages?.[0]?.id === updatedMsg.id) {
                        return { ...c, messages: [updatedMsg] };
                    }
                    return c;
                })
            );
        };

        // ── Phase 8: Handle deleted messages ─────────────
        const handleMessageDeleted = ({ conversationId, messageId, deletedForAll }) => {
            if (selectedConvIdRef.current === conversationId) {
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (msg.id === messageId) {
                            return { ...msg, isDeleted: true, deletedForAll, content: "" };
                        }
                        return msg;
                    })
                );
            }
        };

        const handleTypingStart = ({ conversationId, userId: typingUserId }) => {
            if (typingUserId === user?.id) return;
            setTypingUsers((prev) => {
                const newState = { ...prev };
                if (!newState[conversationId]) {
                    newState[conversationId] = new Set();
                } else {
                    newState[conversationId] = new Set(newState[conversationId]);
                }
                newState[conversationId].add(typingUserId);
                return newState;
            });
        };

        const handleTypingStop = ({ conversationId, userId: typingUserId }) => {
            if (typingUserId === user?.id) return;
            setTypingUsers((prev) => {
                const newState = { ...prev };
                if (newState[conversationId]) {
                    const newSet = new Set(newState[conversationId]);
                    newSet.delete(typingUserId);
                    newState[conversationId] = newSet;
                }
                return newState;
            });
        };

        // ── Group socket events ───────────────────────────
        const handleGroupUpdated = ({ conversation }) => {
            setConversations((prev) => prev.map((c) => c.id === conversation.id ? { ...c, ...conversation } : c));
            if (selectedConvIdRef.current === conversation.id) {
                setSelectedConversation((prev) => ({ ...prev, ...conversation }));
            }
        };

        const handleGroupMemberAdded = ({ conversationId, conversation }) => {
            setConversations((prev) => {
                const exists = prev.find((c) => c.id === conversationId);
                if (exists) return prev.map((c) => c.id === conversationId ? { ...c, ...conversation } : c);
                return [conversation, ...prev];
            });
            if (selectedConvIdRef.current === conversationId && conversation) {
                setSelectedConversation((prev) => ({ ...prev, ...conversation }));
            }
        };

        const handleGroupMemberRemoved = ({ conversationId, userId: removedUserId }) => {
            if (removedUserId === user?.id) {
                setConversations((prev) => prev.filter((c) => c.id !== conversationId));
                if (selectedConvIdRef.current === conversationId) {
                    setSelectedConversation(null);
                    setMessages([]);
                    selectedConvIdRef.current = null;
                }
            } else {
                setSelectedConversation((prev) => {
                    if (!prev || prev.id !== conversationId) return prev;
                    return { ...prev, participants: prev.participants.filter((p) => p.user.id !== removedUserId) };
                });
            }
        };

        const handleGroupDeleted = ({ conversationId }) => {
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
            if (selectedConvIdRef.current === conversationId) {
                setSelectedConversation(null);
                setMessages([]);
                selectedConvIdRef.current = null;
            }
        };

        const handleGroupRoleChanged = ({ conversationId, userId: targetUserId, role }) => {
            if (selectedConvIdRef.current === conversationId) {
                setSelectedConversation((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        participants: prev.participants.map((p) =>
                            p.user.id === targetUserId ? { ...p, role } : p
                        ),
                    };
                });
            }
        };

        socket.on("new:message", handleNewMessage);
        socket.on("message:statusUpdate", handleStatusUpdate);
        socket.on("message:edited", handleMessageEdited);
        socket.on("message:deleted", handleMessageDeleted);
        socket.on("typing:start", handleTypingStart);
        socket.on("typing:stop", handleTypingStop);
        socket.on("group:updated", handleGroupUpdated);
        socket.on("group:memberAdded", handleGroupMemberAdded);
        socket.on("group:memberRemoved", handleGroupMemberRemoved);
        socket.on("group:deleted", handleGroupDeleted);
        socket.on("group:roleChanged", handleGroupRoleChanged);

        return () => {
            socket.off("new:message", handleNewMessage);
            socket.off("message:statusUpdate", handleStatusUpdate);
            socket.off("message:edited", handleMessageEdited);
            socket.off("message:deleted", handleMessageDeleted);
            socket.off("typing:start", handleTypingStart);
            socket.off("typing:stop", handleTypingStop);
            socket.off("group:updated", handleGroupUpdated);
            socket.off("group:memberAdded", handleGroupMemberAdded);
            socket.off("group:memberRemoved", handleGroupMemberRemoved);
            socket.off("group:deleted", handleGroupDeleted);
            socket.off("group:roleChanged", handleGroupRoleChanged);
        };
    }, [socket, user?.id]);

    // Get typing users for the current conversation
    const getTypingUsers = useCallback((conversationId) => {
        const typingSet = typingUsers[conversationId];
        if (!typingSet || typingSet.size === 0) return [];
        return Array.from(typingSet);
    }, [typingUsers]);

    return (
        <ChatContext.Provider
            value={{
                conversations,
                selectedConversation,
                messages,
                loadingConversations,
                loadingMessages,
                selectConversation,
                createConversation,
                sendMessage,
                fetchConversations,
                startTyping,
                stopTyping,
                resetTypingTimeout,
                getTypingUsers,
                blockUser,
                unblockUser,
                checkBlockStatus,
                markAsRead,
                // Group functions
                createGroup,
                updateGroup,
                addMembers,
                removeMember,
                promoteMember,
                demoteMember,
                leaveGroup,
                deleteGroup,
                // Phase 8: Edit, Delete, Reply
                replyingTo,
                setReplyingTo,
                cancelReply,
                editingMessage,
                setEditingMessage,
                cancelEdit,
                editMessage,
                deleteMessageForSelf,
                deleteMessageForEveryone,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
