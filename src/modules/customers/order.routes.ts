import express from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { orderController } from "./order.controller";

const orderRoutes = express.Router();

orderRoutes.post("/checkout", authenticate, orderController.createOrder);
orderRoutes.get("/my", authenticate, orderController.getUserOrders);

export default orderRoutes;


