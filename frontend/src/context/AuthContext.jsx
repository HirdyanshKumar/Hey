import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setLoading(false);
                return;
            }
            const { data } = await api.get("/auth/me");
            setUser(data.user);
        } catch (error) {
            localStorage.removeItem("token");
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            localStorage.setItem("token", data.token);
            setUser(data.user);
            toast.success("Welcome back!");
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.error || "Login failed. Please try again.";
            toast.error(message);
            return { success: false, error: message };
        }
    };

    const register = async (email, password, displayName) => {
        try {
            const { data } = await api.post("/auth/register", {
                email,
                password,
                displayName,
            });
            localStorage.setItem("token", data.token);
            setUser(data.user);
            toast.success("Account created successfully!");
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.error || "Registration failed. Please try again.";
            toast.error(message);
            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (error) {
            // Continue with local logout even if API call fails
        } finally {
            localStorage.removeItem("token");
            setUser(null);
            toast.success("Logged out.");
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                checkAuth,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
