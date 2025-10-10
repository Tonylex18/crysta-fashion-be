import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICartItem extends Document {
  user_id: Types.ObjectId;
  product_id: Types.ObjectId;
  quantity: number;
  size?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  size: {
    type: String
  },
  color: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate cart items
cartItemSchema.index({ user_id: 1, product_id: 1, size: 1, color: 1 }, { unique: true });

export default mongoose.model<ICartItem>('CartItem', cartItemSchema);
