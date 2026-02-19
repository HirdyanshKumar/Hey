import { useState } from "react";
import Sidebar from "./Sidebar";
import WelcomeScreen from "./WelcomeScreen";
import { SocketProvider } from "../context/SocketContext";

const ChatLayout = () => {
    const [selectedChat, setSelectedChat] = useState(null);

    return (
        <SocketProvider>
            <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
                {/* Sidebar */}
                <Sidebar selectedChat={selectedChat} onSelectChat={setSelectedChat} />

                {/* Main Chat Area */}
                <main className="flex-1 flex flex-col min-w-0">
                    <WelcomeScreen />
                </main>
            </div>
        </SocketProvider>
    );
};

export default ChatLayout;
