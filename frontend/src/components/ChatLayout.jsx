import Sidebar from "./Sidebar";
import WelcomeScreen from "./WelcomeScreen";
import ChatWindow from "./ChatWindow";
import { SocketProvider } from "../context/SocketContext";
import { ChatProvider } from "../context/ChatContext";
import { useChat } from "../context/ChatContext";

const ChatContent = () => {
    const { selectedConversation, selectConversation } = useChat();

    return (
        <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
            {/* Sidebar */}
            <Sidebar />

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {selectedConversation ? (
                    <ChatWindow onBack={() => selectConversation(null)} />
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
