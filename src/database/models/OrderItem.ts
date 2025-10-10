import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOrderItem extends Document {
  order_id: Types.ObjectId;
  product_id: Types.ObjectId;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
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
    min: 1
  },
  size: {
    type: String
  },
  color: {
    type: String
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

export default mongoose.model<IOrderItem>('OrderItem', orderItemSchema);
