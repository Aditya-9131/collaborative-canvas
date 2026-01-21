import { WebSocketClient } from "./websocket";

interface Point {
    x: number;
    y: number;
}

interface Stroke {
    points: Point[];
    color: string;
    size: number;
    tool: 'brush' | 'eraser';
}

export class CollaborativeCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private ws: WebSocketClient;

    // State
    private isDrawing = false;
    private currentStroke: Point[] = [];
    private currentColor = '#000000';
    private currentSize = 5;
    private currentTool: 'brush' | 'eraser' = 'brush';

    // History (Authoritative)
    private operations: any[] = [];
    private undoMap: Set<string> = new Set();

    // Live Remote State
    private otherCursors: Map<string, Point> = new Map();
    private otherUserColors: Map<string, string> = new Map();
    private liveStrokes: Map<string, { points: Point[], color: string, size: number }> = new Map();

    // Offscreen Buffer (Optimization)
    private offscreenCanvas: HTMLCanvasElement;
    private offscreenCtx: CanvasRenderingContext2D;
    private isDirty = true; // Signals that offscreen needs update

    constructor(canvas: HTMLCanvasElement, ws: WebSocketClient) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false })!;
        this.ws = ws;

        // Create offscreen buffer
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.setupInputHandlers();
        this.setupNetworkHandlers();

        requestAnimationFrame(() => this.renderLoop());
    }

    private resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement!.getBoundingClientRect();

        // Main Canvas
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        // Offscreen Canvas (matches resolution)
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx.scale(dpr, dpr);

        this.isDirty = true;
    }

    private setupInputHandlers() {
        this.canvas.addEventListener('pointerdown', (e) => this.startStroke(e));
        this.canvas.addEventListener('pointermove', (e) => this.moveStroke(e));
        this.canvas.addEventListener('pointerup', () => this.endStroke());
        this.canvas.addEventListener('pointerout', () => this.endStroke());
    }

    private getPoint(e: PointerEvent): Point {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    private startStroke(e: PointerEvent) {
        this.isDrawing = true;
        this.canvas.setPointerCapture(e.pointerId);
        const p = this.getPoint(e);
        this.currentStroke = [p];
    }

    private lastPointSentTime = 0;

    private moveStroke(e: PointerEvent) {
        const p = this.getPoint(e);

        const now = Date.now();
        if (now - this.lastPointSentTime > 30) {
            this.ws.emit('cursor_move', p);
            this.lastPointSentTime = now;
        }

        if (!this.isDrawing) return;

        this.currentStroke.push(p);

        // Emit live stroke part
        this.ws.emit('live_stroke', { points: [p], color: this.currentColor, size: this.currentSize });
    }

    private endStroke() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentStroke.length > 0) {
            this.ws.emit('draw_stroke', {
                points: this.currentStroke, // Full stroke for reliability
                color: this.currentColor,
                size: this.currentSize,
                tool: this.currentTool
            });
            this.currentStroke = [];
        }
    }

    private setupNetworkHandlers() {
        this.ws.on('room_state', (data: any) => {
            console.log('Got room state', data);
            this.operations = data.history;
            this.rebuildUndoMap();
            this.isDirty = true;
        });

        this.ws.on('operation_committed', (op: any) => {
            this.operations.push(op);
            if (op.type === 'UNDO') {
                this.handleUndoOp(op);
            }
            this.isDirty = true;

            // Clear live strokes for the user who committed
            if (this.liveStrokes.has(op.userId)) {
                this.liveStrokes.delete(op.userId);
            }
        });

        this.ws.on('user_cursor', (data: any) => {
            this.otherCursors.set(data.userId, data.pos);
        });

        this.ws.on('user_joined', (user: any) => {
            this.otherUserColors.set(user.id, user.color);
        });

        this.ws.on('stroke_part', (msg: any) => {
            // Live Drawing from others
            const userId = msg.userId;
            const data = msg.data;

            if (!this.liveStrokes.has(userId)) {
                this.liveStrokes.set(userId, { points: [], color: data.color, size: data.size });
            }
            const stroke = this.liveStrokes.get(userId)!;
            // Append points
            stroke.points.push(...data.points);
        });

        this.ws.on('user_left', (userId: any) => {
            this.otherCursors.delete(userId);
            this.liveStrokes.delete(userId);
        });
    }

    private handleUndoOp(op: any) {
        const targetId = op.data.targetOperationId;
        this.undoMap.add(targetId);
    }

    private rebuildUndoMap() {
        this.undoMap.clear();
        this.operations.forEach(op => {
            if (op.type === 'UNDO') {
                this.undoMap.add(op.data.targetOperationId);
            }
        });
    }

    // --- Rendering ---

    private renderLoop() {
        // 1. Update Offscreen Buffer if needed (Expensive, O(history))
        if (this.isDirty) {
            this.updateOffscreenBuffer();
            this.isDirty = false;
        }

        // 2. Clear Main Canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 3. Draw History (Cheap, 1 image)
        this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);

        // 4. Draw Live Remote Strokes
        this.liveStrokes.forEach(stroke => {
            this.drawStrokeToContext(this.ctx, stroke.points, stroke.color, stroke.size, 'brush');
        });

        // 5. Draw Local Prediction
        if (this.currentStroke.length > 0) {
            this.drawStrokeToContext(this.ctx, this.currentStroke, this.currentColor, this.currentSize, this.currentTool);
        }

        // 6. Draw Cursors
        this.otherCursors.forEach((pos, userId) => {
            this.drawCursor(pos, userId);
        });

        requestAnimationFrame(() => this.renderLoop());
    }

    private updateOffscreenBuffer() {
        // Clear Offscreen
        this.offscreenCtx.fillStyle = '#ffffff';
        this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

        // Draw all operations
        this.operations.forEach(op => {
            if (op.type === 'DRAW') {
                if (this.undoMap.has(op.id)) return; // Skip undone
                this.drawStrokeToContext(this.offscreenCtx, op.data.points, op.data.color, op.data.size, op.data.tool);
            }
        });
    }

    private drawStrokeToContext(ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number, tool: string) {
        if (points.length < 1) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = size;
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }

    private drawCursor(pos: Point, userId: string) {
        const color = this.otherUserColors.get(userId) || '#000';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = color;
        this.ctx.fillText(userId.slice(0, 4), pos.x + 10, pos.y + 10);

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // --- Public API ---
    public setColor(color: string) { this.currentColor = color; }
    public setSize(size: number) { this.currentSize = size; }
    public setTool(tool: 'brush' | 'eraser') { this.currentTool = tool; }
    public triggerUndo() { this.ws.emit('undo', {}); }
}
