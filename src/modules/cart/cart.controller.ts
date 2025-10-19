import { Request, Response } from "express";
import CartItem from "../../database/models/CartItem";

export const getCartItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const items = await CartItem.find({ user_id: userId }).populate("product_id");
    return res.status(200).json(items);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch cart", error: error.message });
  }
};

export const addCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, size, color, quantity = 1 } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!productId) return res.status(400).json({ message: "productId is required" });

    // upsert on unique combo
    const existing = await CartItem.findOne({ user_id: userId, product_id: productId, size, color });
    if (existing) {
      existing.quantity += Number(quantity) || 1;
      await existing.save();
      return res.status(200).json(existing);
    }

    const created = await CartItem.create({ user_id: userId, product_id: productId, size, color, quantity });
    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to add item", error: error.message });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { quantity } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!quantity || quantity < 1) return res.status(400).json({ message: "quantity must be >= 1" });

    const item = await CartItem.findOneAndUpdate({ _id: id, user_id: userId }, { $set: { quantity } }, { new: true });
    if (!item) return res.status(404).json({ message: "Cart item not found" });
    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update item", error: error.message });
  }
};

export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await CartItem.findOneAndDelete({ _id: id, user_id: userId });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to remove item", error: error.message });
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await CartItem.deleteMany({ user_id: userId });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to clear cart", error: error.message });
  }
};


