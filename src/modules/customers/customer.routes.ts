import express from "express";
import { userController } from "./customer.controller";
import { authenticateToken } from "../../middleware/auth";

const userRoutes = express.Router();

userRoutes.post('/sign-up', userController.UserSignUP)
userRoutes.post('/verify-user-mail', userController.verifyEmail)
userRoutes.post('/request-new-otp', userController.requestNewOTP)
userRoutes.get('/get-all-users', userController.getAllUsers)
userRoutes.get('/get-a-user/:id', userController.getaUser)
userRoutes.post('/login', userController.UserLogin)
userRoutes.get('/profile', authenticateToken, userController.getUserProfile)
userRoutes.post('/refresh-token', userController.refreshToken)
userRoutes.post('/delivery-information', authenticateToken, userController.addDeliveryInformation)
userRoutes.get('/get-delivery-details', authenticateToken, userController.getDeliveryInformation)
userRoutes.put('/update-delivery-information', authenticateToken, userController.updateDeliveryInformation)

export default userRoutes;