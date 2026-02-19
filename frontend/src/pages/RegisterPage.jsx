import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Mail, Lock, Eye, EyeOff, User, MessageCircle, Loader2 } from "lucide-react";

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
        <div className="auth-container">
            <div className="auth-card">
                {/* Logo / Brand */}
                <div className="auth-brand">
                    <div className="auth-logo">
                        <MessageCircle size={32} />
                    </div>
                    <h1 className="auth-title">Create account</h1>
                    <p className="auth-subtitle">Join Hey and start chatting</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="displayName" className="auth-label">Display Name</label>
                        <div className="auth-input-wrapper">
                            <User size={18} className="auth-input-icon" />
                            <input
                                id="displayName"
                                type="text"
                                placeholder="Your name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="auth-input"
                                required
                                autoComplete="name"
                            />
                        </div>
                        {errors.displayName && <span className="auth-error">{errors.displayName}</span>}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="email" className="auth-label">Email</label>
                        <div className="auth-input-wrapper">
                            <Mail size={18} className="auth-input-icon" />
                            <input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="auth-input"
                                required
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && <span className="auth-error">{errors.email}</span>}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password" className="auth-label">Password</label>
                        <div className="auth-input-wrapper">
                            <Lock size={18} className="auth-input-icon" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="auth-input"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="auth-toggle-password"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="auth-error">{errors.password}</span>}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
                        <div className="auth-input-wrapper">
                            <Lock size={18} className="auth-input-icon" />
                            <input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="Repeat your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="auth-input"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}
                    </div>

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={isLoading || !email || !password || !displayName || !confirmPassword}
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="auth-spinner" />
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Create Account
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="auth-footer">
                    Already have an account?{" "}
                    <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
