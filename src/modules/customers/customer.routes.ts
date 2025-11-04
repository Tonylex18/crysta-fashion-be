import express from "express";
import { userController } from "./customer.controller";
import { authenticate } from "../../shared/middleware/authenticate";

const userRoutes = express.Router();

userRoutes.post('/sign-up', userController.UserSignUP)
userRoutes.post('/verify-user-mail', userController.verifyEmail)
userRoutes.post('/request-new-otp', userController.requestNewOTP)
userRoutes.get('/get-all-users', userController.getAllUsers)
userRoutes.get('/get-a-user/:id', userController.getaUser)
userRoutes.post('/login', userController.UserLogin)
userRoutes.get('/profile', authenticate, userController.getUserProfile)
userRoutes.post('/refresh-token', userController.refreshToken)
userRoutes.post('/delivery-information', authenticate, userController.addDeliveryInformation)
userRoutes.get('/get-delivery-details', authenticate, userController.getDeliveryInformation)
userRoutes.put('/update-delivery-information', authenticate, userController.updateDeliveryInformation)

export default userRoutes;