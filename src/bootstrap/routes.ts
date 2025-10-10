import { Application } from "express";
import globalErrorHandler from "../utils/global-error/global-error.handler";
import userRoutes from "../modules/customers/customer.routes";

const handleRoutes = (app: Application) => {
	// health check
	app.get("/health", (req, res) => {
		res.status(200).json({
			status: "success",
			message: "Server is up and running",
		});
	});
	
	// user routes
	app.use("/api/user", userRoutes)

	app.use(globalErrorHandler);
};

export { handleRoutes };
