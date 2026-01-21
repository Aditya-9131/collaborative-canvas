# Deployment Checklist for Render

## Pre-Deployment Verification

1. **Test Build Locally**:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```
   Open http://localhost:3000 - should look identical to dev

2. **Check Build Output**:
   - `dist/server/` should contain compiled .js files
   - `dist/server/public/` should contain index.html, assets/, etc.

3. **Verify Files**:
   - ✅ `render.yaml` exists
   - ✅ `vite.config.ts` has `base: '/'`
   - ✅ `.gitignore` excludes `node_modules/` and `dist/`

## Deploy to Render

1. **Commit & Push**:
   ```bash
   git add .
   git commit -m "fix: Production build configuration for Render"
   git push origin main
   ```

2. **On Render Dashboard**:
   - New + → Blueprint
   - Select your repo
   - Render auto-detects `render.yaml`
   - Click "Apply"

3. **Monitor Deployment**:
   - Watch build logs for errors
   - Look for: "Serving static files from: /opt/render/project/src/dist/server/public"
   - Wait for "Server running on http://localhost:XXXX"

4. **Test Deployed App**:
   - Open your Render URL
   - Check browser console for 404 errors
   - Test drawing, colors, tools, rooms

## Troubleshooting

**If CSS/JS don't load**:
- Check Render logs for "Serving static files from..."
- Verify build created `dist/server/public/index.html`
- Check browser Network tab for 404s

**If WebSocket fails**:
- Render supports WebSockets by default
- Check connection status in app UI
- Verify Socket.io connects to same origin

**If build fails**:
- Check Node version (should be ≥16)
- Verify all dependencies in `package.json`
- Check Render build logs for specific error
