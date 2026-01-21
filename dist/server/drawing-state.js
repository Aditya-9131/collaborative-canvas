"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingState = void 0;
const uuid_1 = require("uuid");
class DrawingState {
    constructor() {
        this.operations = [];
        this.undoMap = new Map();
    }
    addOperation(op) {
        op.timestamp = Date.now();
        this.operations.push(op);
        if (op.type === 'UNDO') {
            this.handleUndo(op);
        }
        return op;
    }
    addDrawOperation(userId, points, color, size, tool) {
        const op = {
            id: (0, uuid_1.v4)(),
            type: 'DRAW',
            userId,
            timestamp: Date.now(),
            data: { points, color, size, tool }
        };
        this.addOperation(op);
        return op;
    }
    addUndoOperation(userId) {
        // Global Undo: Find last non-undone draw op
        let targetOpId = null;
        for (let i = this.operations.length - 1; i >= 0; i--) {
            const op = this.operations[i];
            if (op.type === 'DRAW') {
                const isUndone = this.undoMap.has(op.id) && this.undoMap.get(op.id).size > 0;
                if (!isUndone) {
                    targetOpId = op.id;
                    break;
                }
            }
        }
        if (!targetOpId)
            return null;
        const op = {
            id: (0, uuid_1.v4)(),
            type: 'UNDO',
            userId,
            timestamp: Date.now(),
            data: { targetOperationId: targetOpId }
        };
        this.addOperation(op);
        return op;
    }
    handleUndo(op) {
        const targetId = op.data.targetOperationId;
        if (!this.undoMap.has(targetId)) {
            this.undoMap.set(targetId, new Set());
        }
        this.undoMap.get(targetId).add(op.id);
    }
    addClearOperation(userId) {
        const op = {
            id: (0, uuid_1.v4)(),
            type: 'CLEAR',
            userId,
            timestamp: Date.now(),
            data: {}
        };
        this.addOperation(op);
        return op;
    }
    getHistory() {
        return this.operations;
    }
}
exports.DrawingState = DrawingState;
