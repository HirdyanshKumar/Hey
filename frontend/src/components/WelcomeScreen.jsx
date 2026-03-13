import { MessageCircle, Sparkles } from "lucide-react";
import { VibeLineLogo } from "./ui/vibeline-logo";

const WelcomeScreen = () => {
    return (
        <div className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-6 bg-transparent p-4">
            <VibeLineLogo size="lg" />

            <div className="text-center">
                <h2 className="mb-2 text-2xl font-bold text-content-primary">
                    Welcome to Hey
                </h2>
                <p className="max-w-md text-sm text-content-secondary">
                    Select a conversation from the sidebar to start chatting, or start a new conversation.
                </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                {[
                    { icon: <MessageCircle size={14} />, label: "Real-time messaging" },
                    { icon: <Sparkles size={14} />, label: "AI-powered assistant" },
                ].map((feature, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs font-medium text-content-secondary"
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
