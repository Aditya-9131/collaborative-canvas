import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: './client',
    base: '/',
    build: {
        outDir: '../dist/client',
        emptyOutDir: true,
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'client/index.html')
            }
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
                changeOrigin: true
            }
        }
    }
});
