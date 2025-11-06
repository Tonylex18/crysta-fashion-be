import { Request, Response } from "express";
import Category from "../../database/models/Category";
import mongoose from "mongoose";
import Product, { IProduct } from "../../database/models/Product";

// 1. CREATE CATEGORY
export const createCategory = async (req: Request, res: Response) => {
    try {
      console.log('Request body:', req.body);
      console.log('Request file:', (req as any).file);
      
      const { 
        name, 
        description, 
        image_url, 
        parent_id, 
        isActive, 
        sortOrder, 
        metaTitle, 
        metaDescription 
      } = req.body;
      
      // Get uploaded file
      const imageFile = (req as any).file;
  
      // Validate name
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }
  
      // Generate slug from name if not provided
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if category exists (by name or slug)
      const existCategory = await Category.findOne({ 
        $or: [
          { name: name.trim() },
          { slug: slug }
        ]
      });
      if (existCategory) {
        return res.status(409).json({
          success: false,
          message: "Category with this name or slug already exists",
        });
      }
  
      // Validate parent_id if provided
      if (parent_id && parent_id !== 'null' && parent_id !== '') {
        if (!mongoose.Types.ObjectId.isValid(parent_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid parent category ID format",
          });
        }
  
        const parentCategory = await Category.findById(parent_id);
        if (!parentCategory) {
          return res.status(404).json({
            success: false,
            message: "Parent category not found",
          });
        }
      }
  
      // Parse isActive (form-data sends as string)
      const parsedIsActive = isActive === 'true' || isActive === true;
      
      // Parse sortOrder (form-data sends as string)
      const parsedSortOrder = sortOrder ? parseInt(sortOrder) : 0;

      // Build public image URL from stored filename
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        const filename = (imageFile as any).filename || (imageFile as any).originalname;
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
      }

      // Create category
      const category = new Category({
        name: name.trim(),
        slug: slug,
        description: description?.trim(),
        image_url: imageUrl,
        parent_id: (parent_id && parent_id !== 'null' && parent_id !== '') ? parent_id : null,
        isActive: parsedIsActive,
        sortOrder: parsedSortOrder,
        metaTitle: metaTitle?.trim(),
        metaDescription: metaDescription?.trim()
      });
  
      await category.save();
  
      // Populate parent if exists
      if (category.parent_id) {
        await category.populate('parent_id', 'name slug');
      }
  
      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category
      });
    } catch (error: any) {
      console.error("Error creating category:", error);
  
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Category with this name or slug already exists",
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
        message: "An error occurred while creating the category",
        error: error.message,
      });
    }
  };

// 2. GET ALL CATEGORIES
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'sortOrder name',
      isActive = 'all',
      parent_id,
      search,
      includeProductCount = 'false'
    } = req.query;

    const query: any = {};

    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (parent_id === 'null' || parent_id === 'top') {
      query.parent_id = null;
    } else if (parent_id) {
      query.parent_id = parent_id;
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    let categoryQuery = Category.find(query)
      .populate('parent_id', 'name slug')
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum);

    if (includeProductCount === 'true') {
      categoryQuery = categoryQuery.populate('productCount');
    }

    const [categories, total] = await Promise.all([
      categoryQuery.lean(),
      Category.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalCategories: total,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    console.error("Get all categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
};

// 3. GET CATEGORY BY ID OR SLUG
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { includeProducts = 'false', includeSubcategories = 'true' } = req.query;

    let category;

    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id).populate('parent_id', 'name slug');
    } else {
      category = await Category.findOne({ slug: id }).populate('parent_id', 'name slug');
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    if (includeSubcategories === 'true') {
      await category.populate('subcategories');
    }

    const productCount = await Product.countDocuments({ category_id: category._id });

    let products: (mongoose.FlattenMaps<IProduct> & Required<{ _id: mongoose.FlattenMaps<unknown>; }> & { __v: number; })[] = [];
    if (includeProducts === 'true') {
      products = await Product.find({ category_id: category._id, isActive: true })
        .select('name slug price image_url stock')
        .limit(10)
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        productCount,
        ...(includeProducts === 'true' && { products })
      }
    });
  } catch (error: any) {
    console.error("Get category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message
    });
  }
};

// 4. UPDATE CATEGORY
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    if (updateData.parent_id) {
      if (!mongoose.Types.ObjectId.isValid(updateData.parent_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category ID format"
        });
      }

      if (updateData.parent_id === id) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent"
        });
      }

      const parentCategory = await Category.findById(updateData.parent_id);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found"
        });
      }
    }

    delete updateData.slug;

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate('parent_id', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error: any) {
    console.error("Update category error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists"
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
      message: "Failed to update category",
      error: error.message
    });
  }
};

// 5. DELETE CATEGORY
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const productCount = await Product.countDocuments({ category_id: id });
    if (productCount > 0 && force !== 'true') {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category with ${productCount} products. Use force=true to delete anyway or move products first.`,
        productCount
      });
    }

    const subcategoryCount = await Category.countDocuments({ parent_id: id });
    if (subcategoryCount > 0 && force !== 'true') {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category with ${subcategoryCount} subcategories. Use force=true to delete anyway or remove subcategories first.`,
        subcategoryCount
      });
    }

    if (force === 'true') {
      await Product.updateMany(
        { category_id: id },
        { $unset: { category_id: "" } }
      );

      await Category.updateMany(
        { parent_id: id },
        { $set: { parent_id: null } }
      );
    }

    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: category
    });
  } catch (error: any) {
    console.error("Delete category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message
    });
  }
};

// 6. DEACTIVATE CATEGORY
export const deactivateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).populate('parent_id', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
      data: category
    });
  } catch (error: any) {
    console.error("Deactivate category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate category",
      error: error.message
    });
  }
};

// 7. ACTIVATE CATEGORY
export const activateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    ).populate('parent_id', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category activated successfully",
      data: category
    });
  } catch (error: any) {
    console.error("Activate category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to activate category",
      error: error.message
    });
  }
};

// 8. GET TOP-LEVEL CATEGORIES
export const getTopLevelCategories = async (req: Request, res: Response) => {
  try {
    const { includeSubcategories = 'true', includeProductCount = 'false' } = req.query;

    let query = Category.find({ parent_id: null, isActive: true }).sort('sortOrder name');

    if (includeSubcategories === 'true') {
      query = query.populate({
        path: 'subcategories',
        match: { isActive: true },
        select: 'name slug image_url sortOrder'
      });
    }

    if (includeProductCount === 'true') {
      query = query.populate('productCount');
    }

    const categories = await query.lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error: any) {
    console.error("Get top-level categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top-level categories",
      error: error.message
    });
  }
};

// 9. GET CATEGORY TREE
export const getCategoryTree = async (req: Request, res: Response) => {
  try {
    const { includeInactive = 'false' } = req.query;

    const buildTree = async (parentId: any = null): Promise<any[]> => {
      const categoryQuery: any = { parent_id: parentId };
      if (includeInactive !== 'true') {
        categoryQuery.isActive = true;
      }

      const categories = await Category.find(categoryQuery)
        .sort('sortOrder name')
        .lean();

      const tree = await Promise.all(
        categories.map(async (category) => {
          const children = await buildTree(category._id);
          const productCount = await Product.countDocuments({ category_id: category._id });

          return {
            ...category,
            productCount,
            children: children.length > 0 ? children : undefined
          };
        })
      );

      return tree;
    };

    const tree = await buildTree(null);

    return res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error: any) {
    console.error("Get category tree error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category tree",
      error: error.message
    });
  }
};

// 10. REORDER CATEGORIES
export const reorderCategories = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Categories array is required"
      });
    }

    const isValid = categories.every(
      (item) => item._id && typeof item.sortOrder === 'number'
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Each category must have _id and sortOrder"
      });
    }

    const updatePromises = categories.map((item) =>
      Category.findByIdAndUpdate(
        item._id,
        { sortOrder: item.sortOrder },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: "Categories reordered successfully"
    });
  } catch (error: any) {
    console.error("Reorder categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reorder categories",
      error: error.message
    });
  }
};

// 11. GET CATEGORY STATISTICS
export const getCategoryStats = async (req: Request, res: Response) => {
  try {
    const [
      totalCategories,
      activeCategories,
      inactiveCategories,
      topLevelCategories,
      categoriesWithProducts
    ] = await Promise.all([
      Category.countDocuments(),
      Category.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: false }),
      Category.countDocuments({ parent_id: null, isActive: true }),
      Category.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'category_id',
            as: 'products'
          }
        },
        {
          $match: {
            'products.0': { $exists: true }
          }
        },
        { $count: 'count' }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCategories,
        activeCategories,
        inactiveCategories,
        topLevelCategories,
        categoriesWithProducts: categoriesWithProducts[0]?.count || 0,
        emptyCategories: totalCategories - (categoriesWithProducts[0]?.count || 0)
      }
    });
  } catch (error: any) {
    console.error("Get category stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category statistics",
      error: error.message
    });
  }
};

// 12. MOVE CATEGORY
export const moveCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newParentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    if (newParentId && newParentId !== 'null') {
      if (!mongoose.Types.ObjectId.isValid(newParentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category ID format"
        });
      }

      if (newParentId === id) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent"
        });
      }

      const parentCategory = await Category.findById(newParentId);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found"
        });
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { parent_id: newParentId === 'null' ? null : newParentId },
      { new: true }
    ).populate('parent_id', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category moved successfully",
      data: category
    });
  } catch (error: any) {
    console.error("Move category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to move category",
      error: error.message
    });
  }
};

export const categoryController = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    deactivateCategory,
    activateCategory,
    getTopLevelCategories,
    getCategoryTree,
    getCategoryStats,

}