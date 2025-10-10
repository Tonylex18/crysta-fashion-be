import path from "path";
import { format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { LogLevel } from "../enums/log-level.enum";

const { combine, timestamp, json } = format;

const createLoggingPath = (fileName: string) =>
	path.join(
		__dirname,
		"..",
		"..",
		"..",
		"../logs",
		fileName,
		`${fileName}-%DATE%.log`
	);

const createFileTransport = (fileName: string, level: LogLevel | null = null) =>
	new DailyRotateFile({
		filename: createLoggingPath(fileName),
		datePattern: "YYYY-MM-DD",
		level: level || undefined,
		zippedArchive: true,
		maxSize: "20m",
		maxFiles: "14d",
		format: combine(timestamp(), json()),
	} as any);

export { createFileTransport };
