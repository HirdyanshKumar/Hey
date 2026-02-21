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
    const [typingUsers, setTypingUsers] = useState({}); // { conversationId: Set<userId> }
    const selectedConvIdRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

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

            // Join the conversation room
            if (socket && isConnected) {
                socket.emit("join:conversation", { conversationId });
            }
        } catch (error) {
            console.error("Failed to fetch conversation:", error);
        } finally {
            setLoadingMessages(false);
        }
    }, [socket, isConnected]);

    // Create or open a conversation with a user
    const createConversation = useCallback(async (participantId) => {
        try {
            const { data } = await api.post("/conversations", { participantId });
            const conv = data.conversation;

            // Add to list if not already present
            setConversations((prev) => {
                const exists = prev.find((c) => c.id === conv.id);
                if (exists) return prev;
                return [conv, ...prev];
            });

            // Select the new conversation
            await selectConversation(conv.id);

            // Join the room so messages arrive immediately
            if (socket && isConnected) {
                socket.emit("join:conversation", { conversationId: conv.id });
            }

            return conv;
        } catch (error) {
            console.error("Failed to create conversation:", error);
            throw error;
        }
    }, [selectConversation, socket, isConnected]);

    // Send a message via Socket.IO
    const sendMessage = useCallback((content) => {
        if (!socket || !isConnected || !selectedConvIdRef.current) return;

        socket.emit("send:message", {
            conversationId: selectedConvIdRef.current,
            content,
        });

        // Stop typing when sending
        stopTyping();
    }, [socket, isConnected]);

    // Typing indicators
    const startTyping = useCallback(() => {
        if (!socket || !isConnected || !selectedConvIdRef.current || isTypingRef.current) return;

        isTypingRef.current = true;
        socket.emit("typing:start", { conversationId: selectedConvIdRef.current });

        // Auto-stop typing after 3 seconds of no new typing events
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

    // Check block status for a conversation
    const checkBlockStatus = useCallback(async (targetUserId) => {
        try {
            const { data } = await api.get("/users/blocked");
            return data.users.some((u) => u.id === targetUserId);
        } catch (error) {
            return false;
        }
    }, []);

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Listen for new messages & typing events
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = ({ conversationId, message }) => {
            // Update message list if this conversation is currently selected
            if (selectedConvIdRef.current === conversationId) {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some((m) => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }

            // Update the conversation list (last message + move to top)
            setConversations((prev) => {
                const updated = prev.map((c) => {
                    if (c.id === conversationId) {
                        return {
                            ...c,
                            messages: [message],
                            updatedAt: message.createdAt,
                        };
                    }
                    return c;
                });
                // Sort by most recent
                return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            });
        };

        const handleTypingStart = ({ conversationId, userId: typingUserId }) => {
            if (typingUserId === user?.id) return; // Ignore own typing
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

        socket.on("new:message", handleNewMessage);
        socket.on("typing:start", handleTypingStart);
        socket.on("typing:stop", handleTypingStop);

        return () => {
            socket.off("new:message", handleNewMessage);
            socket.off("typing:start", handleTypingStart);
            socket.off("typing:stop", handleTypingStop);
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
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
