import express from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { getCartItems, addCartItem, updateCartItem, removeCartItem, clearCart } from "./cart.controller";

const cartRoutes = express.Router();

cartRoutes.get("/get-cart", authenticate, getCartItems);
cartRoutes.post("/add-cart", authenticate, addCartItem);
cartRoutes.put("/update-cart/:id", authenticate, updateCartItem);
cartRoutes.delete("/remove-cart/:id", authenticate, removeCartItem);
cartRoutes.delete("/clear-cart", authenticate, clearCart);

export default cartRoutes;


