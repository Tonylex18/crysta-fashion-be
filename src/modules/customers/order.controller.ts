import { Request, Response } from "express";
import CartItem from "../../database/models/CartItem";
import OrderItem from "../../database/models/OrderItem";
import Order from "../../database/models/Order";

// Create order from cart
export const createOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const {
            shippingAddress,
            billingAddress,
            paymentMethod,
            phoneNumber
        } = req.body;

        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Please provide shipping address and payment method"
            });
        }

        // Get user's cart items
        const cartItems = await CartItem.find({ user_id: userId }).populate("product_id");

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }

        // Verify stock availability for all items
        
        for (const item of cartItems) {
            const product = item.product_id as any;
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }
        }

        // Calculate totals
        const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shippingFee = subtotal > 10000 ? 0 : 500; // Free delivery over 10000
        const tax = subtotal * 0.075; // 7.5% tax
        const totalAmount = subtotal + shippingFee + tax;

        // Create order
        const newOrder = new Order({
            user_id: userId,
            orderNumber: generateOrderNumber(),
            items: [],
            subtotal,
            shippingFee,
            tax,
            totalAmount,
            total: totalAmount,
            shipping_address: shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            paymentMethod,
            phoneNumber,
            status: "pending",
            paymentStatus: "pending"
        });

        await newOrder.save();

        // Create order items and update product stock
        for (const cartItem of cartItems) {
            const product = cartItem.product_id as any;

            const orderItem = new OrderItem({
                order_id: newOrder._id,
                product_id: cartItem.product_id,
                quantity: cartItem.quantity,
                price: cartItem.price,
                subtotal: cartItem.price * cartItem.quantity,
                color: cartItem.color,
                size: cartItem.size,
                specifications: cartItem.specifications || ''
            });

            await orderItem.save();
            (newOrder as any).items.push(orderItem._id);

            // Update product stock
            product.stock -= cartItem.quantity;
            await product.save();
        }

        await newOrder.save();

        // Clear cart after order
        await CartItem.deleteMany({ user_id: userId });

        const populatedOrder = await Order.findById(newOrder._id)
            .populate({
                path: "items",
                populate: {
                    path: "product_id",
                    select: "name image_url"
                }
            })
            .populate("user_id", "name email");

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: populatedOrder
        });
    } catch (error: any) {
        console.error("Create order error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while creating order",
            error: error.message
        });
    }
};

// Get all orders for a user
export const getUserOrders = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { status, page = 1, limit = 10 } = req.query;

        const filter: any = { user_id: userId };
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const orders = await Order.find(filter)
            .populate({
                path: "items",
                populate: {
                    path: "product_id",
                    select: "name image_url price"
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalItems: total,
                itemsPerPage: Number(limit)
            }
        });
    } catch (error: any) {
        console.error("Get user orders error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching orders",
            error: error.message
        });
    }
};

// Get all orders (Admin)
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { status, page = 1, limit = 20, startDate, endDate } = req.query;

        const filter: any = {};
        if (status) filter.status = status;
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate as string);
            if (endDate) filter.createdAt.$lte = new Date(endDate as string);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const orders = await Order.find(filter)
            .populate("user_id", "name email")
            .populate({
                path: "items",
                populate: {
                    path: "product_id",
                    select: "name image_url price"
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalItems: total,
                itemsPerPage: Number(limit)
            }
        });
    } catch (error: any) {
        console.error("Get all orders error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching orders",
            error: error.message
        });
    }
};

// Get single order
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id)
            .populate("user_id", "name email")
            .populate({
                path: "items",
                populate: {
                    path: "product_id",
                    select: "name image_url price"
                }
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: order
        });
    } catch (error: any) {
        console.error("Get order error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching order",
            error: error.message
        });
    }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        order.status = status;

        if (status === "delivered") {
            (order as any).deliveredAt = new Date();
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: order
        });
    } catch (error: any) {
        console.error("Update order status error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating order status",
            error: error.message
        });
    }
};

// Update payment status
export const updatePaymentStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { paymentStatus, transactionId } = req.body;

        const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];

        if (!validPaymentStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status"
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        (order as any).paymentStatus = paymentStatus;
        
        if (transactionId) {
            (order as any).transactionId = transactionId;
        }

        if (paymentStatus === "paid") {
            (order as any).paidAt = new Date();
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data: order
        });
    } catch (error: any) {
        console.error("Update payment status error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating payment status",
            error: error.message
        });
    }
};

// Cancel order
export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if user owns the order
        if ((order as any).user_id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to cancel this order"
            });
        }

        if (order.status === "delivered" || order.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel ${order.status} order`
            });
        }

        // Restore product stock
        const orderItems = await OrderItem.find({ order_id: id }).populate("product_id");
        
        for (const item of orderItems) {
            const product = item.product_id as any;
            product.stock += item.quantity;
            await product.save();
        }

        order.status = "cancelled";
        (order as any).cancelledAt = new Date();
        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: order
        });
    } catch (error: any) {
        console.error("Cancel order error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while cancelling order",
            error: error.message
        });
    }
};

// Get order statistics (Admin)
export const getOrderStatistics = async (req: Request, res: Response) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: "pending" });
        const processingOrders = await Order.countDocuments({ status: "processing" });
        const deliveredOrders = await Order.countDocuments({ status: "delivered" });
        const cancelledOrders = await Order.countDocuments({ status: "cancelled" });

        const totalRevenue = await Order.aggregate([
            { $match: { status: "delivered", paymentStatus: "paid" } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    status: "delivered",
                    paymentStatus: "paid",
                    createdAt: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
                    }
                }
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalOrders,
                pendingOrders,
                processingOrders,
                deliveredOrders,
                cancelledOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                monthlyRevenue: monthlyRevenue[0]?.total || 0
            }
        });
    } catch (error: any) {
        console.error("Get order statistics error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching order statistics",
            error: error.message
        });
    }
};

// Helper function to generate order number
function generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `ORD-${timestamp.slice(-8)}-${random}`;
}

export const orderController = {
    createOrder,
    getUserOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder,
    getOrderStatistics
};