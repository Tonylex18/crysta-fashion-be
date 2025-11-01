import express from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { cartRoutes } from "./cart.controller";

const CartRoutes = express.Router();

CartRoutes.get("/get-cart", authenticate, cartRoutes.getCartItems);
CartRoutes.post("/add-cart", authenticate, cartRoutes.addCartItem);
CartRoutes.put("/update-cart/:id", authenticate, cartRoutes.updateCartItem);
CartRoutes.delete("/remove-cart/:id", authenticate, cartRoutes.removeCartItem);
CartRoutes.delete("/clear-cart", authenticate, cartRoutes.clearCart);

export default CartRoutes;


