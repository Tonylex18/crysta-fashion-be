import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: mongoose.Types.ObjectId;
  isActive: boolean;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    unique: true
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
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  image_url: {
    type: String,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        // Allow both URLs and local paths
        return /^(https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)|uploads\/.+\.(jpg|jpeg|png|gif|webp|svg))$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  },
  parent_id: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  },
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
categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ parent_id: 1, isActive: 1 });

// Virtual for product count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category_id',
  count: true
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent_id'
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
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
  
  // Set meta fields if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.name.substring(0, 60);
  }
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.substring(0, 160);
  }
  
  next();
});

// Prevent deletion if category has products
categorySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  const productCount = await mongoose.model('Product').countDocuments({ category_id: this._id });
  if (productCount > 0) {
    throw new Error('Cannot delete category with existing products');
  }
  
  // Delete subcategories or prevent deletion
  const subcategoryCount = await mongoose.model('Category').countDocuments({ parent_id: this._id });
  if (subcategoryCount > 0) {
    throw new Error('Cannot delete category with subcategories');
  }
  
  next();
});

// Static method to find active categories
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort('sortOrder name');
};

// Static method to find top-level categories
categorySchema.statics.findTopLevel = function() {
  return this.find({ parent_id: null, isActive: true }).sort('sortOrder name');
};

// Instance method to get full category path
categorySchema.methods.getPath = async function(): Promise<string[]> {
  const path: string[] = [this.name];
  let current = this;
  
  while (current.parent_id) {
    const parentCategory = await mongoose.model('Category').findById(current.parent_id);
    if (!parentCategory) break;
    current = parentCategory;
    if (current) {
      path.unshift(current.name);
    } else {
      break;
    }
  }
  
  return path;
};

export default mongoose.model<ICategory>('Category', categorySchema);