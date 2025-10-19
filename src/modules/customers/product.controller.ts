import { Request, Response } from "express";
import Category from "../../database/models/Category";
import Product from "../../database/models/Product";

// Create a new product
export const createProduct = async (req: Request, res: Response) => {
    try {
        const {
            name,
            description,
            price,
            originalPrice,
            categoryId,
            brand,
            model,
            specifications,
            colors,
            images,
            stock,
            rating,
            reviewCount,
            featured,
            tags
        } = req.body;

        // Validate required fields
        if (!name || !price || !categoryId) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, price, and category"
            });
        }

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        const newProduct = new Product({
            name,
            description,
            price,
            originalPrice,
            categoryId,
            brand,
            model,
            specifications,
            colors,
            images,
            stock,
            rating: rating || 0,
            reviewCount: reviewCount || 0,
            featured: featured || false,
            tags
        });

        await newProduct.save();

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: newProduct
        });
    } catch (error: any) {
        console.error("Create product error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while creating product",
            error: error.message
        });
    }
};

// Get all products with filters and pagination
export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            limit = 12,
            categoryId,
            minPrice,
            maxPrice,
            brand,
            color,
            rating,
            sortBy = "createdAt",
            order = "desc",
            search,
            featured
        } = req.query;

        const filter: any = {};

        // Apply filters
        if (categoryId) filter.categoryId = categoryId;
        if (brand) filter.brand = { $regex: brand, $options: "i" };
        if (color) filter.colors = { $in: [color] };
        if (rating) filter.rating = { $gte: Number(rating) };
        if (featured) filter.featured = featured === "true";
        
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const sortOrder = order === "asc" ? 1 : -1;

        const products = await Product.find(filter)
            .populate("categoryId", "name slug")
            .sort({ [sortBy as string]: sortOrder })
            .skip(skip)
            .limit(Number(limit));

        const total = await Product.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: products,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalItems: total,
                itemsPerPage: Number(limit)
            }
        });
    } catch (error: any) {
        console.error("Get products error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching products",
            error: error.message
        });
    }
};

// Get single product by ID
export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id)
            .populate("categoryId", "name slug");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        console.error("Get product error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching product",
            error: error.message
        });
    }
};

// Update product
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const product = await Product.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product
        });
    } catch (error: any) {
        console.error("Update product error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating product",
            error: error.message
        });
    }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error: any) {
        console.error("Delete product error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while deleting product",
            error: error.message
        });
    }
};

// Update product stock
export const updateProductStock = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { quantity, operation } = req.body;

        if (!quantity || !operation) {
            return res.status(400).json({
                success: false,
                message: "Please provide quantity and operation (add/subtract)"
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (operation === "add") {
            product.stock += quantity;
        } else if (operation === "subtract") {
            if (product.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient stock"
                });
            }
            product.stock -= quantity;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid operation. Use 'add' or 'subtract'"
            });
        }

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            data: product
        });
    } catch (error: any) {
        console.error("Update stock error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating stock",
            error: error.message
        });
    }
};

export const productController = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    updateProductStock
};