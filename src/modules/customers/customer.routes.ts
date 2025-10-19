import express from "express";
import { userController } from "./customer.controller";

const userRoutes = express.Router();

userRoutes.post('/sign-up', userController.UserSignUP)
userRoutes.post('/verify-user-mail', userController.verifyEmail)
userRoutes.post('/request-new-otp', userController.requestNewOTP)
userRoutes.get('/get-all-users', userController.getAllUsers)
userRoutes.get('/get-a-user/:id', userController.getaUser)
userRoutes.post('/login', userController.UserLogin)

export default userRoutes;