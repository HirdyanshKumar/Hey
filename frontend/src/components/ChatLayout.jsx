import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import WelcomeScreen from "./WelcomeScreen";
import ChatWindow from "./ChatWindow";
import { SocketProvider } from "../context/SocketContext";
import { ChatProvider } from "../context/ChatContext";
import { useChat } from "../context/ChatContext";
import { cn } from "../lib/utils";

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
        <div className="flex h-[100dvh] w-full overflow-hidden bg-surface-bg">
            <div className={cn("flex h-full w-full flex-col border-r border-border bg-surface-panel transition-all md:w-80 md:flex-none lg:w-96", (isMobile && selectedConversation) && "hidden")}>
                <Sidebar />
            </div>

            <main className={cn("flex h-full flex-1 flex-col overflow-hidden bg-surface-bg transition-all", (isMobile && !selectedConversation) && "hidden")}>
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
