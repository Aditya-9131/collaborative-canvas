# Architecture: Real-Time Collaborative Drawing Canvas

## System Overview
This system is a **Centralized Authoritative State** application. The server is the single source of truth for the drawing history (Operation Log). Clients are dumb rendering terminals that speculatively predict their own actions but ultimately converge to the server's state.

## Core Design Decisions

### 1. Data Structure: Operation Log vs. Bitmap
**Decision**: We store a **Log of Operations** (Vector data), not a Bitmap.
**Why**:
- allows **Global Undo/Redo** by replaying the history minus the undone operation.
- Resolution Independence (Retina/High-DPI ready).
- Bandwidth efficient (sending control points is cheaper than sending image chunks).

### 2. Networking: WebSockets (Socket.io)
**Decision**: Use Socket.io.
**Why**:
- Fallbacks for older networks/proxies (Long Polling) enhance reliability.
- Built-in "Room" support simplifies the multi-user requirement.
- Auto-reconnection logic is production-critical.
- *Native WebSockets would require reinventing reconnection and broadcasting logic.*

### 3. Conflict Resolution: Last-Write-Wins (Append-Only Log)
**Strategy**: Global Total Ordering using Server Arrival Time.
- Every operation received by the server is stamped with a `serverTimestamp` and a monotonically increasing `sequenceId`.
- **Undo Logic**: "Undo" is a new operation type (`UNDO`) that references a `targetOperationId`. The renderer simply skips actions that have been "undone" when replaying the log.

### 4. Client-Side Prediction
- **Latency Hiding**: When a user draws, we render immediately on a "Temporary Canvas".
- **Reconciliation**: When the server confirms the stroke, we move it to the "Committed Canvas".
- **Desync Handling**: If the server rejects a stroke (rare) or reorders it significantly (unlikely with this logic), we technically should redraw. For simple drawing, LWW (Last Write Wins) mostly just means "draw on top", so strict rollback is rarely visible unless handling Z-index changes.

## Data Flow Diagram

```mermaid
graph TD
    UserA[User A (Client)] -->|1. Draw Stroke (Points)| ClientStoreA[Client Store A]
    ClientStoreA -->|2. Render Prediction| CanvasA[Canvas A]
    ClientStoreA -->|3. Emit: DRAW_STROKE| Server[Node.js Server]
    
    Server -->|4. Validate & Assign SeqID| OpsLog[Global Operations Log]
    OpsLog -->|5. Broadcast: STROKE_COMMITTED| UserA
    OpsLog -->|5. Broadcast: STROKE_COMMITTED| UserB[User B (Client)]
    
    UserB -->|6. Receive Action| ClientStoreB[Client Store B]
    ClientStoreB -->|7. Reorder/Merge| CanvasB[Canvas B]
    
    UserA -->|8. Receive Confirmation| ClientStoreA
    ClientStoreA -->|9. Move from Temp to Main| CanvasA
```

## Protocol (WebSocket Events)

### Client -> Server
1.  `join_room(roomId: string)`
2.  `draw_point(data: PointData)` - Streaming points (Live)
3.  `draw_end(data: StrokeData)` - Finalizing a stroke
4.  `undo()` - Request global undo of self/last action

### Server -> Client
1.  `room_state(users: User[], history: Operation[])` - Initial Sync
2.  `user_cursor(userId: string, positions: Point)` - Live cursor updates
3.  `stroke_part(userId: string, point: Point)` - Live drawing streaming
4.  `operation_committed(op: Operation)` - Finalized action
5.  `undo_committed(undoneOpId: string)` - Notify all to un-render a stroke

## Performance Optimizations
1.  **Event Throttling**: Mouse events fire faster than monitors (120Hz+). We throttle network packets to ~30ms (33fps) but keep local rendering at 60fps+ for smoothness.
2.  **Dirty Rectangles**: (Bonus) Only redraw the bounding box of the changed stroke if re-rendering history.
3.  **Offscreen Canvas**:
    - **Layer 1**: Static History (Expensive to draw, rarely updates).
    - **Layer 2**: Live strokes & Cursors (Cheap, updates every frame).

## Scalability
- **Current**: Single Node.js process. Memory bottleneck = Array size of operations.
- **Future**: Redis Pub/Sub for multi-server scaling. Snapshotting legacy history to S3/Blob storage to reduce RAM usage.
