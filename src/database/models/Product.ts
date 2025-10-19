import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category_id: Types.ObjectId;
  image_url?: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  stock: number;
  sku?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  featured: boolean;
  isActive: boolean;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  discountPercentage: number;
  stockStatus: 'out_of_stock' | 'low_stock' | 'in_stock';
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value);
      },
      message: 'Price must be a valid number'
    }
  },
  compareAtPrice: {
    type: Number,
    min: [0, 'Compare at price cannot be negative'],
    validate: {
      validator: function(this: IProduct, value: number) {
        return !value || value >= this.price;
      },
      message: 'Compare at price must be greater than or equal to the selling price'
    }
  },
  category_id: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true
  },
  image_url: {
    type: String,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return /^(https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)|uploads\/.+\.(jpg|jpeg|png|gif|webp|svg))$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string)  {
        if (!v) return true;
        return /^(https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)|uploads\/.+\.(jpg|jpeg|png|gif|webp|svg))$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  sizes: [{
    type: String,
    uppercase: true
  }],
  colors: [{
    type: String,
    trim: true
  }],
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Stock must be a whole number'
    }
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: {
      type: Number,
      min: [0, 'Length cannot be negative']
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    }
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ featured: 1, isActive: 1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function(this: IProduct) {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function(this: IProduct) {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= 5) return 'low_stock';
  return 'in_stock';
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add timestamp if slug might not be unique
    if (!this.isNew && this.isModified('name')) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  
  // Set metaTitle and metaDescription if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.name.substring(0, 60);
  }
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.substring(0, 160);
  }
  
  next();
});

// Static method to find products by category
productSchema.statics.findByCategory = function(categoryId: Types.ObjectId) {
  return this.find({ category_id: categoryId, isActive: true });
};

// Static method to find featured products
productSchema.statics.findFeatured = function(limit: number = 10) {
  return this.find({ featured: true, isActive: true }).limit(limit);
};

// Instance method to check if product is available
productSchema.methods.isAvailable = function(): boolean {
  return this.isActive && this.stock > 0;
};

// Instance method to update stock
productSchema.methods.updateStock = function(quantity: number): Promise<IProduct> {
  this.stock += quantity;
  return this.save();
};

export default mongoose.model<IProduct>('Product', productSchema);