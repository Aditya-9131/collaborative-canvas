import { DrawingState } from './drawing-state';

export interface User {
    id: string;
    color: string;
    cursor: { x: number; y: number } | null;
}

export class Room {
    public id: string;
    public drawingState: DrawingState;
    public users: Map<string, User> = new Map();

    constructor(id: string) {
        this.id = id;
        this.drawingState = new DrawingState();
    }

    public addUser(userId: string): User {
        // Assign a random distinct color for the user
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', '#F5FF33'];
        const color = colors[this.users.size % colors.length];

        const user: User = {
            id: userId,
            color,
            cursor: null
        };
        this.users.set(userId, user);
        return user;
    }

    public removeUser(userId: string) {
        this.users.delete(userId);
    }

    public getUser(userId: string): User | undefined {
        return this.users.get(userId);
    }

    public updateCursor(userId: string, x: number, y: number) {
        const user = this.users.get(userId);
        if (user) {
            user.cursor = { x, y };
        }
    }

    public getAllUsers(): User[] {
        return Array.from(this.users.values());
    }
}

export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    constructor() { }

    public getRoom(roomId: string): Room {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Room(roomId));
        }
        return this.rooms.get(roomId)!;
    }

    public deleteRoom(roomId: string) {
        this.rooms.delete(roomId);
    }
}
