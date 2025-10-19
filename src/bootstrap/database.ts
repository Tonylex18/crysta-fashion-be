import { Application } from "express";
import mongoose, { ConnectOptions } from "mongoose";
import logger from "../utils/logging";

const handleDBConnect = async (app: Application) => {
	const MONGODB_URI = process.env.MONGODB_URI as string;
	try {
		await mongoose.connect(MONGODB_URI, {} as ConnectOptions);
		// await RunSeeders();
		logger.general.info(`connected to database successfully.`);
	} catch (err) {
		logger.general.error("Database connection error:", err);
	}
};

export default handleDBConnect;