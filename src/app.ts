import cookieParser from 'cookie-parser';
import express from "express";
import "express-async-errors";
import path from 'path';
import bootstrap from './bootstrap';
import { ENV } from './config/env';
import { config } from './config/config';


export const app = express();

// Enable trust proxy so req.protocol reflects original protocol behind proxies
// Only trust the first proxy in production, which is typically the reverse proxy (nginx, cloudflare, etc.)
app.set('trust proxy', ENV.NODE_ENV === 'production' ? 1 : false);

app.use(express.json());
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Handle Important Configs
bootstrap.handleCompression(app);
bootstrap.handleCors(app);
bootstrap.handleSecurity(app);
bootstrap.handleRateLimiting(app);

// All App Routes
bootstrap.handleRoutes(app);

// Server Listening Configs
export const port = Number(ENV.PORT) || config.defaults.port;

async function main() {
	await bootstrap.handleDBConnect(app);
}
main();