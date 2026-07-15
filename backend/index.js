import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

io.on("connection", (socket) => {
    console.log("user connected", socket.id);

    let currentRoom = null;
    let currentUser = null;

    socket.on("join", ({ roomId, userName }) => {
        if (currentRoom) {
            socket.leave(currentRoom);
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
        }

        currentRoom = roomId;
        currentUser = userName;

        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }

        rooms.get(roomId).add(userName);

        io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
        console.log("User Joined Room", roomId);
    });

    socket.on("codeChange", ({ roomId, code }) => {
        socket.to(roomId).emit("codeUpdate", code);
    });

    socket.on("leaveRoom", () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
            socket.to(currentRoom).emit("cursorRemove", { socketId: socket.id });

            socket.leave(currentRoom);

            currentRoom = null;
            currentUser = null;
        }
    });

    socket.on("typing", ({ roomId, userName }) => {
        socket.to(roomId).emit("userTyping", userName);
    });

    socket.on("languageChange", ({ roomId, language }) => {
        socket.to(roomId).emit("languageUpdate", language);
    });

    socket.on("cursorChange", ({ roomId, userName, position }) => {
        socket.to(roomId).emit("cursorUpdate", {
            socketId: socket.id,
            userName,
            position,
        });
    });

    socket.on("disconnect", () => {
        if (currentRoom && currentUser) {
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
            socket.to(currentRoom).emit("cursorRemove", { socketId: socket.id });
        }
        console.log("User Disconnected");

    })
});

const PORT = process.env.PORT || 5000;

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "/frontend/dist")));

app.get("{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

