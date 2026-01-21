"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = exports.Room = void 0;
const drawing_state_1 = require("./drawing-state");
class Room {
    constructor(id) {
        this.users = new Map();
        this.id = id;
        this.drawingState = new drawing_state_1.DrawingState();
    }
    addUser(userId) {
        // Assign a random distinct color for the user
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', '#F5FF33'];
        const color = colors[this.users.size % colors.length];
        const user = {
            id: userId,
            color,
            cursor: null
        };
        this.users.set(userId, user);
        return user;
    }
    removeUser(userId) {
        this.users.delete(userId);
    }
    getUser(userId) {
        return this.users.get(userId);
    }
    updateCursor(userId, x, y) {
        const user = this.users.get(userId);
        if (user) {
            user.cursor = { x, y };
        }
    }
    getAllUsers() {
        return Array.from(this.users.values());
    }
}
exports.Room = Room;
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    getRoom(roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Room(roomId));
        }
        return this.rooms.get(roomId);
    }
    deleteRoom(roomId) {
        this.rooms.delete(roomId);
    }
}
exports.RoomManager = RoomManager;
