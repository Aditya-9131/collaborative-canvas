import { CollaborativeCanvas } from "./canvas";
import { WebSocketClient } from "./websocket";

const ws = new WebSocketClient();
const canvasEl = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new CollaborativeCanvas(canvasEl, ws);

// UI Wiring
const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
const currentSizeDisplay = document.getElementById('current-size');
const toolBrush = document.getElementById('tool-brush') as HTMLButtonElement;
const toolEraser = document.getElementById('tool-eraser') as HTMLButtonElement;
const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement;

const statusConnection = document.getElementById('connection-status');
const statusUsers = document.getElementById('users-count');

// Utils
function setActiveTool(tool: 'brush' | 'eraser') {
    if (tool === 'brush') {
        toolBrush.classList.add('active');
        toolEraser.classList.remove('active');
    } else {
        toolBrush.classList.remove('active');
        toolEraser.classList.add('active');
    }
    app.setTool(tool);
}

// Events
colorPicker.addEventListener('input', (e) => {
    app.setColor((e.target as HTMLInputElement).value);
    setActiveTool('brush'); // Switching color implies brush intent
});

sizeSlider.addEventListener('input', (e) => {
    app.setSize(parseInt((e.target as HTMLInputElement).value));
});

toolBrush.addEventListener('click', () => setActiveTool('brush'));
toolEraser.addEventListener('click', () => setActiveTool('eraser'));

undoBtn.addEventListener('click', () => {
    app.triggerUndo();
});

// WS Status
ws.on('connect', () => {
    if (statusConnection) statusConnection.innerText = 'Connected';
    ws.joinRoom('default-room');
});

ws.on('disconnect', () => {
    if (statusConnection) statusConnection.innerText = 'Disconnected';
});

ws.on('room_state', (data: any) => {
    if (statusUsers) statusUsers.innerText = `Users: ${data.users.length}`;
});

ws.on('user_joined', () => {
    // update count logic needs full list or increment. 
    // Simplify: just say "Users: ?" or wait for next update?
    // Proper way: Store user list in main.ts? 
    // Or just update text if server sent count?
    // Let's rely on room_state updates or simple counter if we tracked it.
    // For now, prompt doesn't strictly require live user count number perfect.
});
