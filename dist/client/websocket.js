"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
const socket_io_client_1 = require("socket.io-client");
class WebSocketClient {
    constructor() {
        this.callbacks = new Map();
        // Auto-connect to relative path or specific URL if needed
        this.socket = (0, socket_io_client_1.io)();
        this.setupGenericListeners();
    }
    setupGenericListeners() {
        this.socket.on('connect', () => this.trigger('connect', null));
        this.socket.on('disconnect', () => this.trigger('disconnect', null));
        // Proxy all interesting events to internal listeners
        const events = [
            'room_state', 'user_joined', 'user_left',
            'operation_committed', 'undo_committed',
            'user_cursor', 'stroke_part'
        ];
        events.forEach(event => {
            this.socket.on(event, (data) => this.trigger(event, data));
        });
    }
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }
    trigger(event, data) {
        const listeners = this.callbacks.get(event);
        if (listeners) {
            listeners.forEach(cb => cb(data));
        }
    }
    joinRoom(roomId) {
        this.socket.emit('join_room', roomId);
    }
    emit(event, data) {
        this.socket.emit(event, data);
    }
}
exports.WebSocketClient = WebSocketClient;
