import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface IOrder extends Document {
  user_id: Types.ObjectId;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  shipping_address: IShippingAddress;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  orderNumber?: string;
  items?: Types.ObjectId[];
  subtotal?: number;
  shippingFee?: number;
  tax?: number;
  totalAmount?: number;
  billingAddress?: IShippingAddress;
  phoneNumber?: string;
  paidAt?: Date;
  deliveredAt?: Date;
  transactionId?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number
  },
  shippingFee: {
    type: Number
  },
  tax: {
    type: Number
  },
  totalAmount: {
    type: Number
  },
  shipping_address: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zip: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  billingAddress: {
    name: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  paymentMethod: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  items: [{
    type: Schema.Types.ObjectId,
    ref: 'OrderItem'
  }],
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  transactionId: {
    type: String
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model<IOrder>('Order', orderSchema);
