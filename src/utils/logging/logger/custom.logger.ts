import { createLogger } from "winston";
import { LogLevel } from "../enums/log-level.enum";
import { consoleTransport } from "../transport/console.transport";
import { createFileTransport } from "../transport/file.transport";

const createCustomLogger = (name: string, level: LogLevel | null = null) =>
	createLogger({
		level: level || 'info',
		transports: [consoleTransport, createFileTransport(name, level) as any],
	});

export { createCustomLogger };