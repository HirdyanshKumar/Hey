import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { VibeLineLogo } from "../components/ui/vibeline-logo";

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) return;

        setIsLoading(true);
        const result = await login(email, password);
        setIsLoading(false);

        if (result.success) {
            navigate("/");
        }
    };

    return (
        <main className="flex min-h-screen w-full items-center justify-center p-4">
            <Card className="w-full max-w-md animate-fade-in p-8">
                {/* Logo / Brand */}
                <div className="mb-8 flex flex-col items-center justify-center gap-4 text-center">
                    <VibeLineLogo size="md" />
                    <div>
                        <h1 className="text-2xl font-semibold text-content-primary">Welcome back</h1>
                        <p className="mt-1 text-sm text-content-secondary">Sign in to continue to Hey</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="email" className="text-sm font-medium text-content-secondary">Email</label>
                        <div className="relative flex items-center">
                            <Mail size={16} className="absolute left-3 text-content-muted" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="password" className="text-sm font-medium text-content-secondary">Password</label>
                        <div className="relative flex items-center">
                            <Lock size={16} className="absolute left-3 text-content-muted" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 pr-9"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-content-muted transition-colors hover:text-content-secondary"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full"
                        disabled={isLoading || !email || !password}
                    >
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <LogIn size={16} className="mr-2" />
                                Sign In
                            </>
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-content-secondary">
                    Don't have an account?{" "}
                    <Link to="/register" className="font-medium text-accent transition-colors hover:text-accent-hover">
                        Create one
                    </Link>
                </p>
            </Card>
        </main>
    );
};

export default LoginPage;
