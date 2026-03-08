const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { generateToken, setTokenCookie } = require("../utils/jwt.utils");

// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { email, password, displayName } = req.body;

        // Validation
        if (!email || !password || !displayName) {
            return res.status(400).json({ error: "All fields are required." });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Please provide a valid email address." });
        }

        if (displayName.trim().length < 2) {
            return res.status(400).json({ error: "Display name must be at least 2 characters." });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                displayName: displayName.trim(),
            },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                readReceiptsEnabled: true,
                preferredLanguage: true,
                createdAt: true,
            },
        });

        // Generate JWT & set cookie
        const token = generateToken(newUser.id);
        setTokenCookie(res, token);

        res.status(201).json({
            message: "Account created successfully.",
            token,
            user: newUser,
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Update last_seen & online status
        await prisma.user.update({
            where: { id: user.id },
            data: { lastSeen: new Date(), isOnline: true },
        });

        // Generate JWT & set cookie
        const token = generateToken(user.id);
        setTokenCookie(res, token);

        // Don't send password back
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: "Logged in successfully.",
            token,
            user: userWithoutPassword,
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
    try {
        // Update user status
        if (req.user?.id) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { isOnline: false, lastSeen: new Date() },
            });
        }

        // Clear cookie
        res.cookie("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 0,
        });

        res.json({ message: "Logged out successfully." });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
                readReceiptsEnabled: true,
                preferredLanguage: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ user });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, logout, getMe };
