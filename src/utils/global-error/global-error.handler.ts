import type { ErrorRequestHandler } from "express";
import createHttpError from "http-errors";
import logger from "../logging";
import { HttpStatusCode } from "../../shared/enums/http-status-code.enum";
import { ForbiddenError } from "../../shared/errors/forbidden.error";
import { UnauthorizedError } from "../../shared/errors/unauthorized.error";

// eslint-disable-next-line
const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
	logger.errors.error(err.stack);

	// Handle custom UnauthorizedError (401)
	if (err instanceof UnauthorizedError) {
		return res.status(err.statusCode).json({
			message: err.message,
			success: false,
			status: err.statusCode,
		});
	}

	// Handle custom ForbiddenError (403)
	if (err instanceof ForbiddenError) {
		return res.status(err.statusCode).json({
			message: err.message,
			success: false,
			status: err.statusCode,
		});
	}

	// Handle http-errors
	if (createHttpError.isHttpError(err)) {
		return res.status(err.statusCode).json({
			message: err.message,
			success: false,
			status: err.statusCode,
		});
	}

	// Handle JWT errors
	if (err.name === 'JsonWebTokenError') {
		return res.status(401).json({
			message: "Invalid or expired token. Please sign in again.",
			success: false,
			status: 401,
		});
	}

	if (err.name === 'TokenExpiredError') {
		return res.status(401).json({
			message: "Token has expired. Please sign in again.",
			success: false,
			status: 401,
		});
	}

	return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
		message: "Oops! Something went wrong. We're on it!",
		success: false,
		status: HttpStatusCode.INTERNAL_SERVER_ERROR,
	});
};

export default globalErrorHandler;
