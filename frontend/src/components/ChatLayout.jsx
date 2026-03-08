import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import WelcomeScreen from "./WelcomeScreen";
import ChatWindow from "./ChatWindow";
import { SocketProvider } from "../context/SocketContext";
import { ChatProvider } from "../context/ChatContext";
import { useChat } from "../context/ChatContext";

const ChatContent = () => {
    const { selectedConversation, selectConversation } = useChat();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleBack = () => {
        selectConversation(null);
    };

    return (
        <div className="chat-layout" style={{ backgroundColor: "var(--bg-primary)" }}>
            {/* Sidebar — hidden on mobile when a conversation is selected */}
            <div className={`chat-layout-sidebar ${isMobile && selectedConversation ? "chat-layout-hidden" : ""}`}>
                <Sidebar />
            </div>

            {/* Main Chat Area — hidden on mobile when no conversation is selected */}
            <main className={`chat-layout-main ${isMobile && !selectedConversation ? "chat-layout-hidden" : ""}`}>
                {selectedConversation ? (
                    <ChatWindow onBack={handleBack} />
                ) : (
                    <WelcomeScreen />
                )}
            </main>
        </div>
    );
};

const ChatLayout = () => {
    return (
        <SocketProvider>
            <ChatProvider>
                <ChatContent />
            </ChatProvider>
        </SocketProvider>
    );
};

export default ChatLayout;
