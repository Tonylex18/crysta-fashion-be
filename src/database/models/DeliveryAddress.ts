import mongoose, { Document, Schema } from 'mongoose';

export interface IDeliveryInformation extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  address: string;
  cityTown: string;
  zipCode: string;
  mobile: string;
  email: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDeliveryInformation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  cityTown: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  isDefault: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Index for faster queries
deliverySchema.index({ userId: 1 });

export default mongoose.model<IDeliveryInformation>('DeliveryInformation', deliverySchema);