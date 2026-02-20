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
    const selectedConvIdRef = useRef(null);

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
    }, [socket, isConnected]);

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Listen for new messages
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

        socket.on("new:message", handleNewMessage);
        return () => socket.off("new:message", handleNewMessage);
    }, [socket]);

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
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContext;
