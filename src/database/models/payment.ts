import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
    userId: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    email: string;
    amount: number;
    reference: string;
    paystackReference?: string;
    status: 'pending' | 'success' | 'failed' | 'abandoned';
    paymentMethod?: string;
    channel?: string;
    currency: string;
    paidAt?: Date;
    metadata?: any;
    paystackResponse?: any;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order'
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    reference: {
        type: String,
        required: true,
        unique: true
    },
    paystackReference: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'abandoned'],
        default: 'pending'
    },
    paymentMethod: {
        type: String
    },
    channel: {
        type: String
    },
    currency: {
        type: String,
        default: 'NGN'
    },
    paidAt: {
        type: Date
    },
    metadata: {
        type: Schema.Types.Mixed
    },
    paystackResponse: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for faster queries
paymentSchema.index({ userId: 1 });
paymentSchema.index({ reference: 1 });
paymentSchema.index({ status: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);
