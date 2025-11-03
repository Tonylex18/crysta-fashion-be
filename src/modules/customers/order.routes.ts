import express from "express";
import { authenticateToken } from "../../middleware/auth";
import { orderController } from "./order.controller";

const orderRoutes = express.Router();

orderRoutes.post("/checkout", authenticateToken, orderController.createOrder);
orderRoutes.get("/my", authenticateToken, orderController.getUserOrders);
orderRoutes.get("/:id", authenticateToken, orderController.getOrderById);
orderRoutes.post("/:id/cancel", authenticateToken, orderController.cancelOrder);

export default orderRoutes;


