"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const canvas_1 = require("./canvas");
const websocket_1 = require("./websocket");
const ws = new websocket_1.WebSocketClient();
const canvasEl = document.getElementById('main-canvas');
const app = new canvas_1.CollaborativeCanvas(canvasEl, ws);
// UI Wiring
const colorPicker = document.getElementById('color-picker');
const sizeSlider = document.getElementById('size-slider');
const currentSizeDisplay = document.getElementById('current-size');
const toolBrush = document.getElementById('tool-brush');
const toolEraser = document.getElementById('tool-eraser');
const toolRect = document.getElementById('tool-rect');
const undoBtn = document.getElementById('btn-undo');
const statusConnection = document.getElementById('connection-status');
const statusUsers = document.getElementById('users-count');
// Utils
function setActiveTool(tool) {
    toolBrush.classList.remove('active');
    toolEraser.classList.remove('active');
    toolRect.classList.remove('active');
    if (tool === 'brush')
        toolBrush.classList.add('active');
    else if (tool === 'eraser')
        toolEraser.classList.add('active');
    else if (tool === 'rectangle')
        toolRect.classList.add('active');
    app.setTool(tool);
}
// RGB Logic
const rInput = document.getElementById('rgb-r');
const gInput = document.getElementById('rgb-g');
const bInput = document.getElementById('rgb-b');
function updateFromRGB() {
    const r = rInput.value;
    const g = gInput.value;
    const b = bInput.value;
    const color = `rgb(${r}, ${g}, ${b})`;
    app.setColor(color);
    setActiveTool('brush');
}
[rInput, gInput, bInput].forEach(input => {
    input.addEventListener('input', updateFromRGB);
});
// Sync RGB sliders when using swatches (Optional/Bonus)
// For simplicity, we just let them work independently for now.
// Events
colorPicker.addEventListener('input', (e) => {
    app.setColor(e.target.value);
    setActiveTool('brush');
});
// Color Swatches
document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        app.setColor(color);
        colorPicker.value = color; // Sync picker
        setActiveTool('brush');
    });
});
sizeSlider.addEventListener('input', (e) => {
    app.setSize(parseInt(e.target.value));
});
toolBrush.addEventListener('click', () => setActiveTool('brush'));
toolEraser.addEventListener('click', () => setActiveTool('eraser'));
toolRect.addEventListener('click', () => setActiveTool('rectangle'));
undoBtn.addEventListener('click', () => {
    app.triggerUndo();
});
const downloadBtn = document.getElementById('btn-download');
downloadBtn.addEventListener('click', () => {
    app.download();
    showToast('Image downloaded!');
});
// Toast Logic
const toastContainer = document.getElementById('toast-container');
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    toastContainer.appendChild(toast);
    // Remove after 3s
    setTimeout(() => {
        toast.style.animation = 'fade-out 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
// Room Logic
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('btn-join');
joinBtn.addEventListener('click', () => {
    const room = roomInput.value || 'default-room';
    ws.joinRoom(room);
    showToast(`Joined Room: ${room}`);
});
// Clear Logic
const clearBtn = document.getElementById('btn-clear');
clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the canvas for everyone?')) {
        app.clear();
    }
});
// WS Status
ws.on('connect', () => {
    if (statusConnection)
        statusConnection.innerText = 'Connected';
    showToast('Connected to Server');
    ws.joinRoom(roomInput.value || 'default-room');
});
ws.on('disconnect', () => {
    if (statusConnection)
        statusConnection.innerText = 'Disconnected';
    showToast('Disconnected from Server');
});
ws.on('room_state', (data) => {
    if (statusUsers)
        statusUsers.innerText = `Users: ${data.users.length}`;
});
ws.on('user_joined', () => {
    showToast('A user joined the room');
});
ws.on('user_left', () => {
    showToast('A user left the room');
});
