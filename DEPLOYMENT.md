# ☁️ Deployment Guide

Since I am an AI assistant running locally, I cannot provide a live URL. However, you can deploy this project yourself for **FREE** in about 2 minutes using Render.com or Railway.

## Option 1: Render.com (Recommended for Free Tier)

1.  **Push to GitHub**: Make sure your project is pushed to a GitHub repository.
2.  **Sign up/Login** to [Render.com](https://render.com).
3.  Click **"New +"** -> **"Web Service"**.
4.  Connect your GitHub repository.
5.  **Settings**:
    *   **Runtime**: Node
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
6.  Click **"Create Web Service"**.

Render will detect the `package.json`, install dependencies, compile the TypeScript (Client & Server), and start the server.

> **Note**: Websockets work automatically on Render.

## Option 2: Heroku

1.  Create a `Procfile` in the root directory:
    ```
    web: npm start
    ```
2.  Install Heroku CLI and login.
3.  `heroku create`
4.  `git push heroku main`

## Local Production Test
To simulate what the cloud server will do:
```bash
npm run build
npm start
```
(Open http://localhost:3000)
