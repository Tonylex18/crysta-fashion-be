import { Application } from "express";
import globalErrorHandler from "../utils/global-error/global-error.handler";
import userRoutes from "../modules/customers/customer.routes";
import cartRoutes from "../modules/cart/cart.routes";
import orderRoutes from "../modules/customers/order.routes";
import ProductRoutes from "../modules/products/product.routes";
import categoryRoutes from "../modules/categories/category.routes";

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
    app.use("/api/cart", cartRoutes)
    app.use("/api/orders", orderRoutes)
	app.use("/api/products", ProductRoutes)
    app.use("/api/categories", categoryRoutes)

	app.use(globalErrorHandler);
};

export { handleRoutes };
