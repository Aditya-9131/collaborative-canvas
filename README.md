# Real-Time Collaborative Drawing Canvas

A high-performance, WebSocket-based collaborative collaborative canvas featuring global undo/redo, live stroke streaming, and strict authoritative state management.

## 🚀 Setup & Running

**Prerequisites**: Node.js (v16+)

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start Development Mode**
    Runs both server (Port 3000) and client (Vite Port 5173).
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

    > Note: `npm run dev` requires the `concurrently` package. If it's not installed, run:
    > `npm install -D concurrently`
    > OR run in two terminals:
    > 1. `npm start`
    > 2. `npm run client`

3.  **Production Build**
    ```bash
    npm run build
    npm start
    ```
    Accesible at [http://localhost:3000](http://localhost:3000)

## 🧪 Multi-User Testing Instructions

1.  Open **Two Browser Windows** (Incognito recommended for separate sessions if testing stateless auth, though socket.io handles IDs separately anyway).
2.  **Draw** in Window A. Observe immediate streaming in Window B.
3.  **Undo**:
    - Draw Red Line (User A).
    - Draw Blue Line (User B).
    - User A hits Undo.
    - Result: The Red Line disappears. The Blue Line remains on top (or below, preserving order).
4.  **Disconnect**: Close Window A, reopen it. The full history should reload.

## 🧠 Architecture Highlights

-   **State Management**: Centralized `OperationLog` (Append-Only). No bitmap state.
-   **Rendering**: Optimized with **Offscreen Canvas** buffering.
    -   *Layer 1 (Offscreen)*: Committed History (Redrawn only on operation updates).
    -   *Layer 2 (Main)*: History Image + Live Remote Strokes + Local Prediction + Cursors (Redrawn 60fps).
-   **Protocol**:
    -   `draw_stroke`: Finalized operations (guaranteed delivery).
    -   `live_stroke` / `cursor_move`: Ephemeral UDP-like streams (fire-and-forget logic for performance).
    -   `undo`: Adds an `UNDO` operation globally.

## ⚠️ Known Limitations

-   **Memory**: The server stores the full operation history in RAM. For 24/7 production, we would implement Snapshotting (saving the canvas to a bitmap keyframe every N operations) to garbage collect the log.
-   **Latency**: We assume decent network conditions. Basic client-side prediction is implemented (draw immediately), but "Conflict Resolution" is strictly "Last Server Time Wins". If User A draws *after* User B but arrives *first*, User A is behind. In a drawing app, this is acceptable.

## Time Spent
-   Design & Architecture: ~30 mins
-   Implementation: ~2 hours
-   Optimization: ~30 mins
