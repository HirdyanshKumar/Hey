import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach JWT from localStorage if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export const searchMessagesAPI = (params) => api.get("/messages/search/all", { params });

export const createAIBotConversationAPI = () => api.post("/ai/bot/conversation");
export const getSmartRepliesAPI = (conversationId) => api.get(`/ai/smart-replies/${conversationId}`);

export default api;
