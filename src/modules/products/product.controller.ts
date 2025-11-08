import { Request, Response } from "express";
import Product from "../../database/models/Product";
import mongoose from "mongoose";

// Add Product
export const addProduct = async (req: Request, res: Response) => {
  try {
    console.log("Request body: ", req.body);
    console.log("Request files: ", (req as any).files);
    console.log("Request file: ", (req as any).file);

    const {
      name,
      price,
      category_id,
      description,
      sizes,
      colors,
      stock,
      featured,
      compareAtPrice,
      sku,
      weight,
      tags,
      metaTitle,
      metaDescription
    } = req.body;

    // Get uploaded files
    const files = (req as any).files;
    const singleFile = (req as any).file;

    // Validation
    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and category are required fields"
      });
    }

    // Validate category_id format
    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if product with same name exists
    const existingProduct = await Product.findOne({
      $or: [
        { name: name.trim() },
        { slug: slug }
      ]
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product with this name already exists"
      });
    }

    // Parse featured (form-data sends as string)
    const parsedFeatured = featured === 'true' || featured === true;

    // Parse stock
    const parsedStock = stock ? parseInt(stock) : 0;

    // Parse compareAtPrice
    const parsedCompareAtPrice = compareAtPrice ? parseFloat(compareAtPrice) : undefined;

    // Parse price
    const parsedPrice = parseFloat(price);

    // Parse weight
    const parsedWeight = weight ? parseFloat(weight) : undefined;

    // Parse arrays (sizes, colors, tags) - form-data might send as string
    const parsedSizes = sizes ? (Array.isArray(sizes) ? sizes : sizes.split(',').map((s: string) => s.trim())) : [];
    const parsedColors = colors ? (Array.isArray(colors) ? colors : colors.split(',').map((c: string) => c.trim())) : [];
    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [];

    // Handle image uploads
    let finalImageUrl = undefined;
    let finalImages: string[] = [];

    // Build absolute base URL using protocol and host
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (files) {
      if (files.image_url && files.image_url.length > 0) {
        const filename = files.image_url[0].filename || files.image_url[0].originalname;
        finalImageUrl = `${baseUrl}/uploads/${filename}`;
      }

      if (files.images && files.images.length > 0) {
        finalImages = files.images.map((file: any) => {
          const filename = file.filename || file.originalname;
          return `${baseUrl}/uploads/${filename}`;
        });
      }

      // If no separate images field, use all uploaded files
      if (!files.images && files.image_url && files.image_url.length > 1) {
        finalImages = files.image_url.slice(1).map((file: any) => {
          const filename = file.filename || file.originalname;
          return `${baseUrl}/uploads/${filename}`;
        });
      }
    } else if (singleFile) {
      const filename = (singleFile as any).filename || (singleFile as any).originalname;
      finalImageUrl = `${baseUrl}/uploads/${filename}`;
    }

    // Create product
    const product = new Product({
      name: name.trim(),
      price: parsedPrice,
      slug,
      category_id,
      description: description?.trim(),
      image_url: finalImageUrl,
      images: finalImages.length > 0 ? finalImages : undefined,
      sizes: parsedSizes.length > 0 ? parsedSizes : undefined,
      colors: parsedColors.length > 0 ? parsedColors : undefined,
      stock: parsedStock,
      featured: parsedFeatured,
      compareAtPrice: parsedCompareAtPrice,
      sku: sku?.trim(),
      weight: parsedWeight,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim()
    });

    await product.save();

    // Populate category before sending response
    await product.populate('category_id', 'name slug');

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });
  } catch (error: any) {
    console.error("Add product error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product with this slug or SKU already exists"
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add product",
      error: error.message
    });
  }
};

// Get All Products with filtering, sorting, and pagination
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      category,
      featured,
      minPrice,
      maxPrice,
      search,
      isActive = 'true',
      inStock
    } = req.query;

    // Build query
    const query: any = {};

    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (category) {
      query.category_id = category;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category_id', 'name slug')
        .sort(sort as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    console.error("Get all products error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
};

// Get Single Product by ID or Slug
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let product;

    // Check if id is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).populate('category_id', 'name slug description');
    } else {
      // Try to find by slug
      product = await Product.findOne({ slug: id }).populate('category_id', 'name slug description');
    }

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
      message: "Failed to fetch product",
      error: error.message
    });
  }
};

// Update Product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log('Raw req.body:', req.body);
    console.log('Files:', files);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    // Validate category_id if provided
    if (updateData.category_id && !mongoose.Types.ObjectId.isValid(updateData.category_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    // Parse JSON strings from FormData back to proper types
    const fieldsToParseAsJSON = ['sizes', 'colors', 'tags'];
    fieldsToParseAsJSON.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (e) {
          console.error(`Failed to parse ${field}:`, e);
        }
      }
    });

    // Convert string booleans to actual booleans
    if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === 'true' || updateData.featured === true;
    }

    // Convert numeric strings to numbers
    const numericFields = ['price', 'stock', 'compareAtPrice', 'weight'];
    numericFields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== '') {
        updateData[field] = parseFloat(updateData[field]);
      }
    });

    // Validate compareAtPrice manually
    if (updateData.compareAtPrice !== undefined) {
      // Get current product to check price
      const currentProduct = await Product.findById(id);
      if (!currentProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const priceToCompare = updateData.price !== undefined ? updateData.price : currentProduct.price;

      if (updateData.compareAtPrice > 0 && updateData.compareAtPrice < priceToCompare) {
        return res.status(400).json({
          success: false,
          message: "Compare at price must be greater than or equal to the selling price"
        });
      }
    }

    // Handle file uploads
    if (files) {
      if (files.image_url && files.image_url[0]) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
        updateData.image_url = `${baseUrl}/uploads/${files.image_url[0].filename}`;
      }

      if (files.images && files.images.length > 0) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
        const imageUrls = files.images.map(file => `${baseUrl}/uploads/${file.filename}`);

        const existingProduct = await Product.findById(id);
        if (existingProduct && existingProduct.images) {
          updateData.images = [...existingProduct.images, ...imageUrls];
        } else {
          updateData.images = imageUrls;
        }
      }
    }

    // Don't allow slug to be manually updated
    delete updateData.slug;

    // console.log('Processed update data:', JSON.stringify(updateData, null, 2));

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate('category_id', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // console.log('Product after update:', JSON.stringify(product, null, 2));

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });
  } catch (error: any) {
    console.error("Update product error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product with this SKU already exists"
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message
    });
  }
};

// Delete Product (Hard Delete)
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: product
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message
    });
  }
};

// Soft Delete (Deactivate) Product
export const deactivateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).populate('category_id', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      data: product
    });
  } catch (error: any) {
    console.error("Deactivate product error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate product",
      error: error.message
    });
  }
};

// Activate Product
export const activateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    ).populate('category_id', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product activated successfully",
      data: product
    });
  } catch (error: any) {
    console.error("Activate product error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to activate product",
      error: error.message
    });
  }
};

// Update Stock
export const updateStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    if (quantity === undefined || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid integer"
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Update stock based on operation
    switch (operation) {
      case 'add':
        product.stock += quantity;
        break;
      case 'subtract':
        product.stock = Math.max(0, product.stock - quantity);
        break;
      case 'set':
      default:
        product.stock = Math.max(0, quantity);
        break;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: {
        _id: product._id,
        name: product.name,
        stock: product.stock,
        stockStatus: product.stockStatus
      }
    });
  } catch (error: any) {
    console.error("Update stock error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update stock",
      error: error.message
    });
  }
};

// Get Featured Products
export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    const products = await Product.find({
      featured: true,
      isActive: true
    })
      .populate('category_id', 'name slug')
      .limit(limitNum)
      .sort('-createdAt')
      .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error: any) {
    console.error("Get featured products error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured products",
      error: error.message
    });
  }
};

// Get Products by Category
export const getProductsByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const query = {
      category_id: categoryId,
      isActive: true
    };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category_id', 'name slug')
        .sort(sort as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total,
        limit: limitNum
      }
    });
  } catch (error: any) {
    console.error("Get products by category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products by category",
      error: error.message
    });
  }
};

// Search Products
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const query = {
      $text: { $search: q.trim() },
      isActive: true
    };

    const [products, total] = await Promise.all([
      Product.find(query, { score: { $meta: "textScore" } })
        .populate('category_id', 'name slug')
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      query: q,
      data: products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
        limit: limitNum
      }
    });
  } catch (error: any) {
    console.error("Search products error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search products",
      error: error.message
    });
  }
};

// Get Low Stock Products
export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const { threshold = 5, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const thresholdNum = Math.max(1, parseInt(threshold as string));

    const query = {
      stock: { $lte: thresholdNum, $gt: 0 },
      isActive: true
    };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category_id', 'name slug')
        .sort('stock')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      threshold: thresholdNum,
      data: products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total,
        limit: limitNum
      }
    });
  } catch (error: any) {
    console.error("Get low stock products error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch low stock products",
      error: error.message
    });
  }
};

// Get Out of Stock Products
export const getOutOfStockProducts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const query = {
      stock: 0,
      isActive: true
    };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category_id', 'name slug')
        .sort('-updatedAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total,
        limit: limitNum
      }
    });
  } catch (error: any) {
    console.error("Get out of stock products error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch out of stock products",
      error: error.message
    });
  }
};

// Bulk Update Products
export const bulkUpdateProducts = async (req: Request, res: Response) => {
  try {
    const { productIds, updateData } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required"
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data is required"
      });
    }

    // Validate all IDs
    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some product IDs are invalid",
        invalidIds
      });
    }

    // Don't allow slug updates in bulk
    delete updateData.slug;

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updateData },
      { runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Products updated successfully",
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error: any) {
    console.error("Bulk update error:", error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to bulk update products",
      error: error.message
    });
  }
};

// Bulk Delete Products
export const bulkDeleteProducts = async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required"
      });
    }

    // Validate all IDs
    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some product IDs are invalid",
        invalidIds
      });
    }

    const result = await Product.deleteMany({ _id: { $in: productIds } });

    return res.status(200).json({
      success: true,
      message: "Products deleted successfully",
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk delete products",
      error: error.message
    });
  }
};

// Get Product Statistics
export const getProductStats = async (req: Request, res: Response) => {
  try {
    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      featuredProducts,
      outOfStock,
      lowStock
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: false }),
      Product.countDocuments({ featured: true, isActive: true }),
      Product.countDocuments({ stock: 0, isActive: true }),
      Product.countDocuments({ stock: { $lte: 5, $gt: 0 }, isActive: true })
    ]);

    const totalValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        inactiveProducts,
        featuredProducts,
        outOfStock,
        lowStock,
        totalInventoryValue: totalValue[0]?.total || 0
      }
    });
  } catch (error: any) {
    console.error("Get product stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product statistics",
      error: error.message
    });
  }
};

export const productRoutes = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  deactivateProduct,
  activateProduct,
  updateStock,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
  getLowStockProducts,
  getOutOfStockProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
  getProductStats
}