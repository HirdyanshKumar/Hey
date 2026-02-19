const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const morgan = require('morgan');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    },
});

app.set("io", io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json('Server is running');
});


// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Error handlers
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.IO — presence tracking with JWT auth
const { initializeSocket } = require("./socket/socket");
initializeSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
