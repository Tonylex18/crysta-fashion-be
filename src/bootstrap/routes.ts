import { Application } from "express";
import globalErrorHandler from "../utils/global-error/global-error.handler";
import userRoutes from "../modules/customers/customer.routes";
import orderRoutes from "../modules/customers/order.routes";
import ProductRoutes from "../modules/products/product.routes";
import categoryRoutes from "../modules/categories/category.routes";
import CartRoutes from "../modules/cart/cart.routes";
import paymentRoutes from "../modules/payment/payment.routes";

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
    app.use("/api/cart", CartRoutes)
    app.use("/api/orders", orderRoutes)
	app.use("/api/products", ProductRoutes)
    app.use("/api/categories", categoryRoutes)
	app.use("/api/payment", paymentRoutes)

	app.use(globalErrorHandler);
};

export { handleRoutes };
