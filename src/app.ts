import cookieParser from 'cookie-parser';
import express from "express";
import "express-async-errors";
import bootstrap from './bootstrap';
import { ENV } from './config/env';
import { config } from './config/config';


export const app = express();

app.use(express.json());
app.use(cookieParser());

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