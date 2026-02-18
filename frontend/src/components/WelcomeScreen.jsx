import { MessageCircle, Sparkles } from "lucide-react";

const WelcomeScreen = () => {
    return (
        <div
            className="flex-1 flex flex-col items-center justify-center gap-6"
            style={{ backgroundColor: "var(--bg-chat)" }}
        >
            {/* Logo */}
            <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                    backgroundColor: "var(--accent)",
                    boxShadow: "0 0 40px var(--accent-glow)",
                }}
            >
                <span className="text-3xl font-bold text-white">H!!</span>
            </div>

            {/* Title */}
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    Welcome to Hey!!
                </h2>
                <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
                    Select a conversation from the sidebar to start chatting, or start a new conversation.
                </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                {[
                    { icon: <MessageCircle size={14} />, label: "Real-time messaging" },
                    { icon: <Sparkles size={14} />, label: "AI-powered assistant" },
                ].map((feature, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                        style={{
                            backgroundColor: "var(--bg-input)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border)",
                        }}
                    >
                        {feature.icon}
                        {feature.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WelcomeScreen;
