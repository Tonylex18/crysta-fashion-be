import express from "express"
import { authenticateToken } from "../../middleware/auth";
import { paymentController } from "./payment.controller";

const paymentRoutes = express.Router();

paymentRoutes.post('/initialize-payment', authenticateToken, paymentController.initializePayment);
paymentRoutes.get("/verify/:reference", authenticateToken, paymentController.verifyPayment);
paymentRoutes.get("/history", authenticateToken, paymentController.getUserPayments);
paymentRoutes.get("/:id", authenticateToken, paymentController.getPaymentDetails);
paymentRoutes.post("/webhook", paymentController.paystackWebhook);

export default paymentRoutes;