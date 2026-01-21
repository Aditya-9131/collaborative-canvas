import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { RoomManager } from './rooms';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for simplicity locally
        methods: ["GET", "POST"]
    }
});

const roomManager = new RoomManager();

// Serve static client files
app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    let currentRoomId = 'default-room'; // Single room for now, can be dynamic

    // Join logic
    socket.on('join_room', (roomId: string) => {
        currentRoomId = roomId;
        socket.join(roomId);

        const room = roomManager.getRoom(roomId);
        const user = room.addUser(socket.id);

        // Send initial state
        socket.emit('room_state', {
            users: room.getAllUsers(),
            history: room.drawingState.getHistory(),
            myId: socket.id,
            myColor: user.color
        });

        // Broadcast to others that user joined
        socket.to(roomId).emit('user_joined', user);
    });

    // Drawing Events
    socket.on('draw_stroke', (data: { points: any[], color: string, size: number, tool: any }) => {
        const room = roomManager.getRoom(currentRoomId);
        // Add to authoritative state logic
        // IMPORTANT: The prompt requires "Live stroke streaming (send points as user draws)"
        // But for Global Undo, we need discrete operations. 
        // Strategy: 
        // 1. Clients broadcast 'cursor_move' / 'stroke_part' for live rendering (ephemeral).
        // 2. Clients send 'draw_end' (or 'draw_stroke') to finalize the operation in the log.
        // The implementation_plan calls for: `draw_point` (streaming) and `draw_end` (finalizing).

        // Finalized Stroke
        const op = room.drawingState.addDrawOperation(
            socket.id,
            data.points,
            data.color,
            data.size,
            data.tool
        );

        // Broadcast the COMMITTED operation to everyone (including sender for confirmation)
        io.to(currentRoomId).emit('operation_committed', op);
    });

    // Undo Event
    socket.on('undo', () => {
        const room = roomManager.getRoom(currentRoomId);
        const op = room.drawingState.addUndoOperation(socket.id);

        if (op) {
            io.to(currentRoomId).emit('operation_committed', op);
            io.to(currentRoomId).emit('undo_committed', op.data.targetOperationId);
        }
    });

    // Live Cursor / Stroke Streaming
    socket.on('cursor_move', (pos: { x: number, y: number }) => {
        const room = roomManager.getRoom(currentRoomId);
        room.updateCursor(socket.id, pos.x, pos.y);
        socket.to(currentRoomId).emit('user_cursor', { userId: socket.id, pos });
    });

    socket.on('live_stroke', (data: { points: any[], color: string, size: number }) => {
        socket.to(currentRoomId).emit('stroke_part', { userId: socket.id, data });
    });

    socket.on('disconnect', () => {
        const room = roomManager.getRoom(currentRoomId);
        room.removeUser(socket.id);
        io.to(currentRoomId).emit('user_left', socket.id);
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
