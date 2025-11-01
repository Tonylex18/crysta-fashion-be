import { Request, Response } from "express";
import CartItem from "../../database/models/CartItem";
import mongoose from "mongoose";

export const addCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, size, color, price, quantity = 1 } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }
    
    if (!productId) {
      return res.status(400).json({ 
        success: false,
        message: "productId is required" 
      });
    }

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid productId format" 
      });
    }

    // Validate quantity
    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({ 
        success: false,
        message: "Quantity must be a number greater than 0" 
      });
    }

    // Check if item already exists with same product, size, and color
    const existing = await CartItem.findOne({ 
      user_id: userId, 
      product_id: productId, 
      size: size || null, 
      color: color || null 
    });

    if (existing) {
      existing.quantity += parsedQuantity;
      await existing.save();
      await existing.populate("product_id");
      
      return res.status(200).json({
        success: true,
        message: "Cart item quantity updated",
        data: existing
      });
    }

    // Create new cart item
    const cartCreated = await CartItem.create({ 
      user_id: userId, 
      product_id: productId, 
      price,
      size, 
      color, 
      quantity: parsedQuantity 
    });
    
    await cartCreated.populate("product_id");
    
    return res.status(201).json({
      success: true,
      message: "Item added to cart",
      data: cartCreated
    });
  } catch (error: any) {
    console.error("Add cart item error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to add item", 
      error: error.message 
    });
  }
};


export const getCartItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const items = await CartItem.find({ user_id: userId })
      .populate("product_id")
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error: any) {
    console.error("Get cart items error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch cart", 
      error: error.message 
    });
  }
};


export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { quantity, size, color } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    // Validate cart item id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid cart item ID" 
      });
    }

    // Validate quantity if provided
    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity < 1) {
        return res.status(400).json({ 
          success: false,
          message: "Quantity must be a number greater than 0" 
        });
      }
    }

    // Build update object
    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (size !== undefined) updateData.size = size;
    if (color !== undefined) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No valid fields to update" 
      });
    }

    const item = await CartItem.findOneAndUpdate(
      { _id: id, user_id: userId }, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    ).populate("product_id");

    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: "Cart item not found" 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart item updated",
      data: item
    });
  } catch (error: any) {
    console.error("Update cart item error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to update item", 
      error: error.message 
    });
  }
};

export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    // Validate cart item id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid cart item ID" 
      });
    }

    const deleted = await CartItem.findOneAndDelete({ 
      _id: id, 
      user_id: userId 
    });

    if (!deleted) {
      return res.status(404).json({ 
        success: false,
        message: "Cart item not found" 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Cart item removed"
    });
  } catch (error: any) {
    console.error("Remove cart item error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to remove item", 
      error: error.message 
    });
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    const result = await CartItem.deleteMany({ user_id: userId });

    return res.status(200).json({ 
      success: true,
      message: "Cart cleared successfully",
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error("Clear cart error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to clear cart", 
      error: error.message 
    });
  }
};

export const cartRoutes = {
  getCartItems,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart
};