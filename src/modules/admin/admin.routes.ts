import express from "express"
import { adminController } from "./admin.controller"

const adminRoutes = express.Router()

adminRoutes.post('/admin-signup', adminController.AdminSignUP)
adminRoutes.post('/admin-login', adminController.AdminLogin)
adminRoutes.post('/verify-admin-mail', adminController.verifyEmail)
adminRoutes.post('/request-new-otp', adminController.requestNewOTP)
adminRoutes.post('/refresh-token', adminController.refreshToken)
adminRoutes.post('/admin-signout', adminController.adminSignout)

export default adminRoutes;
