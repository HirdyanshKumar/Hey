import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { VibeLineLogo } from "../components/ui/vibeline-logo";

const RegisterPage = () => {
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { register } = useAuth();
    const navigate = useNavigate();

    const validate = () => {
        const newErrors = {};

        if (!displayName.trim() || displayName.trim().length < 2) {
            newErrors.displayName = "Display name must be at least 2 characters.";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            newErrors.email = "Please enter a valid email address.";
        }

        if (!password || password.length < 6) {
            newErrors.password = "Password must be at least 6 characters.";
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);
        const result = await register(email, password, displayName.trim());
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
                        <h1 className="text-2xl font-semibold text-content-primary">Create account</h1>
                        <p className="mt-1 text-sm text-content-secondary">Join Hey and start chatting</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="displayName" className="text-sm font-medium text-content-secondary">Display Name</label>
                        <div className="relative flex items-center">
                            <User size={16} className="absolute left-3 text-content-muted" />
                            <Input
                                id="displayName"
                                type="text"
                                placeholder="Your name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="pl-9"
                                required
                                autoComplete="name"
                            />
                        </div>
                        {errors.displayName && <span className="text-xs text-status-error">{errors.displayName}</span>}
                    </div>

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
                        {errors.email && <span className="text-xs text-status-error">{errors.email}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="password" className="text-sm font-medium text-content-secondary">Password</label>
                        <div className="relative flex items-center">
                            <Lock size={16} className="absolute left-3 text-content-muted" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 pr-9"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-content-muted transition-colors hover:text-content-secondary"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && <span className="text-xs text-status-error">{errors.password}</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-content-secondary">Confirm Password</label>
                        <div className="relative flex items-center">
                            <Lock size={16} className="absolute left-3 text-content-muted" />
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="Repeat your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-9 pr-9"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        {errors.confirmPassword && <span className="text-xs text-status-error">{errors.confirmPassword}</span>}
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 w-full"
                        disabled={isLoading || !email || !password || !displayName || !confirmPassword}
                    >
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <UserPlus size={16} className="mr-2" />
                                Create Account
                            </>
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-content-secondary">
                    Already have an account?{" "}
                    <Link to="/login" className="font-medium text-accent transition-colors hover:text-accent-hover">
                        Sign in
                    </Link>
                </p>
            </Card>
        </main>
    );
};

export default RegisterPage;
