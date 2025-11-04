import express from "express";
import { orderController } from "./order.controller";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorizeRoles } from "../../shared/middleware/auth-user-roles.middleware";
import { Role } from "../../shared/enums/user-role.enum";

const orderRoutes = express.Router();

orderRoutes.post("/checkout", authenticate, orderController.createOrder);
orderRoutes.get("/get-all-orders", authenticate, orderController.getUserOrders);
orderRoutes.get("/get-order-byId/:id", authenticate, orderController.getOrderById);
orderRoutes.post("/cancel-order/:id/cancel", authenticate, orderController.cancelOrder);
orderRoutes.put("/update-order-status/:id", authenticate, authorizeRoles([Role.ADMIN]), orderController.updateOrderStatus)

export default orderRoutes;


