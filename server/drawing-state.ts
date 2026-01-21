import { v4 as uuidv4 } from 'uuid';

export interface Point {
    x: number;
    y: number;
    pressure?: number;
}

export type OperationType = 'DRAW' | 'UNDO';

export interface Operation {
    id: string;
    type: OperationType;
    userId: string;
    timestamp: number;
    data: any;
}

export interface DrawOperation extends Operation {
    type: 'DRAW';
    data: {
        points: Point[];
        color: string;
        size: number;
        tool: 'brush' | 'eraser';
    };
}

export interface UndoOperation extends Operation {
    type: 'UNDO';
    data: {
        targetOperationId: string;
    };
}

export class DrawingState {
    private operations: Operation[] = [];
    private undoMap: Map<string, Set<string>> = new Map();

    constructor() { }

    public addOperation(op: Operation): Operation {
        op.timestamp = Date.now();
        this.operations.push(op);

        if (op.type === 'UNDO') {
            this.handleUndo(op as UndoOperation);
        }
        return op;
    }

    public addDrawOperation(userId: string, points: Point[], color: string, size: number, tool: 'brush' | 'eraser'): DrawOperation {
        const op: DrawOperation = {
            id: uuidv4(),
            type: 'DRAW',
            userId,
            timestamp: Date.now(),
            data: { points, color, size, tool }
        };
        this.addOperation(op);
        return op;
    }

    public addUndoOperation(userId: string): UndoOperation | null {
        // Global Undo: Find last non-undone draw op
        let targetOpId: string | null = null;

        for (let i = this.operations.length - 1; i >= 0; i--) {
            const op = this.operations[i];
            if (op.type === 'DRAW') {
                const isUndone = this.undoMap.has(op.id) && this.undoMap.get(op.id)!.size > 0;
                if (!isUndone) {
                    targetOpId = op.id;
                    break;
                }
            }
        }

        if (!targetOpId) return null;

        const op: UndoOperation = {
            id: uuidv4(),
            type: 'UNDO',
            userId,
            timestamp: Date.now(),
            data: { targetOperationId: targetOpId }
        };

        this.addOperation(op);
        return op;
    }

    private handleUndo(op: UndoOperation) {
        const targetId = op.data.targetOperationId;
        if (!this.undoMap.has(targetId)) {
            this.undoMap.set(targetId, new Set());
        }
        this.undoMap.get(targetId)!.add(op.id);
    }

    public getHistory(): Operation[] {
        return this.operations;
    }
}
