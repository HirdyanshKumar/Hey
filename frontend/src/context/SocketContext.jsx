/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isConnected, setIsConnected] = useState(false);
    const [socketInstance, setSocketInstance] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            // Disconnect if logged out
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsConnected(false);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setOnlineUsers(new Set());
            }
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) return;

        const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

        const socket = io(SOCKET_URL, {
            auth: { token },
            withCredentials: true,
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;
        setSocketInstance(socket);

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            setIsConnected(true);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
            setIsConnected(false);
        });

        // Receive full list of online users on connect
        socket.on("users:online", (userIds) => {
            setOnlineUsers(new Set(userIds));
        });

        // A user came online
        socket.on("user:online", ({ userId }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.add(userId);
                return next;
            });
        });

        // A user went offline
        socket.on("user:offline", ({ userId }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, user]);

    const isUserOnline = (userId) => onlineUsers.has(userId);

    return (
        <SocketContext.Provider
            value={{
                socket: socketInstance,
                isConnected,
                onlineUsers,
                isUserOnline,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
