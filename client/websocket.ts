import { io, Socket } from "socket.io-client";

type EventCallback = (data: any) => void;

export class WebSocketClient {
    private socket: Socket;
    private callbacks: Map<string, EventCallback[]> = new Map();

    constructor() {
        // Auto-connect to same origin (Render-safe)
        this.socket = io();

        this.setupGenericListeners();
    }

    private setupGenericListeners() {
        this.socket.on("connect", () => this.trigger("connect", null));
        this.socket.on("disconnect", () => this.trigger("disconnect", null));

        const events = [
            "room_state",
            "user_joined",
            "user_left",
            "operation_committed",
            "undo_committed",
            "user_cursor",
            "stroke_part"
        ];

        events.forEach((event) => {
            // ✅ FIX: explicitly type data
            this.socket.on(event, (data: any) => {
                this.trigger(event, data);
            });
        });
    }

    public on(event: string, callback: EventCallback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event)!.push(callback);
    }

    private trigger(event: string, data: any) {
        const listeners = this.callbacks.get(event);
        if (listeners) {
            listeners.forEach((cb) => cb(data));
        }
    }

    public joinRoom(roomId: string) {
        this.socket.emit("join_room", roomId);
    }

    public emit(event: string, data: any) {
        this.socket.emit(event, data);
    }
}
