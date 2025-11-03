import { Request, Response } from "express";
import crypto from "crypto";
import { paystackService } from "../../utils/paystack.service";
import Payment from "../../database/models/payment";

// Initialize payment
export const initializePayment = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { amount, email, orderId, metadata } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        // Validate required fields
        if (!amount || !email) {
            return res.status(400).json({
                success: false,
                message: "Amount and email are required"
            });
        }

        // Validate amount (minimum ₦100)
        if (amount < 100) {
            return res.status(400).json({
                success: false,
                message: "Amount must be at least ₦100"
            });
        }

        // Generate unique reference
        const reference = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Prepare metadata
        const paymentMetadata = {
            userId,
            orderId,
            ...metadata
        };

        // Initialize payment with Paystack
        const paystackResponse = await paystackService.initializePayment(
            email,
            amount,
            paymentMetadata
        );

        if (!paystackResponse.status) {
            return res.status(400).json({
                success: false,
                message: "Failed to initialize payment with Paystack"
            });
        }

        // Save payment record to database
        const payment = new Payment({
            userId,
            orderId,
            email,
            amount,
            reference,
            paystackReference: paystackResponse.data.reference,
            status: 'pending',
            metadata: paymentMetadata,
            currency: 'NGN'
        });

        await payment.save();

        return res.status(200).json({
            success: true,
            message: "Payment initialized successfully",
            data: {
                authorizationUrl: paystackResponse.data.authorization_url,
                accessCode: paystackResponse.data.access_code,
                reference: paystackResponse.data.reference,
                paymentId: payment._id
            }
        });

    } catch (error: any) {
        console.error("Initialize payment error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while initializing payment",
            error: error.message
        });
    }
};

// Verify payment
export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({
                success: false,
                message: "Payment reference is required"
            });
        }

        // Verify payment with Paystack
        const paystackResponse = await paystackService.verifyPayment(reference);

        if (!paystackResponse.status) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }

        // Find payment in database
        const payment = await Payment.findOne({ paystackReference: reference });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found"
            });
        }

        // Update payment status
        const transactionData = paystackResponse.data;

        payment.status = transactionData.status === 'success' ? 'success' : 'failed';
        payment.paystackResponse = transactionData;
        payment.paymentMethod = transactionData.authorization?.brand;
        payment.channel = transactionData.channel;
        payment.paidAt = transactionData.status === 'success' ? new Date(transactionData.paid_at) : undefined;

        await payment.save();

        return res.status(200).json({
            success: true,
            message: `Payment ${payment.status}`,
            data: {
                status: payment.status,
                amount: payment.amount,
                reference: payment.reference,
                paidAt: payment.paidAt,
                channel: payment.channel
            }
        });

    } catch (error: any) {
        console.error("Verify payment error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while verifying payment",
            error: error.message
        });
    }
};

// Webhook handler for Paystack events
export const paystackWebhook = async (req: Request, res: Response) => {
    try {
        // Verify webhook signature
        const hash = crypto
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).json({
                success: false,
                message: "Invalid signature"
            });
        }

        const event = req.body;

        // Handle different event types
        switch (event.event) {
            case 'charge.success':
                await handleSuccessfulPayment(event.data);
                break;

            case 'charge.failed':
                await handleFailedPayment(event.data);
                break;

            default:
                console.log(`Unhandled event type: ${event.event}`);
        }

        return res.status(200).send('Webhook received');

    } catch (error: any) {
        console.error("Webhook error:", error);
        return res.status(500).json({
            success: false,
            message: "Webhook processing failed",
            error: error.message
        });
    }
};

// Helper function to handle successful payment
const handleSuccessfulPayment = async (data: any) => {
    const payment = await Payment.findOne({ paystackReference: data.reference });

    if (payment && payment.status !== 'success') {
        payment.status = 'success';
        payment.paystackResponse = data;
        payment.paidAt = new Date(data.paid_at);
        payment.channel = data.channel;
        payment.paymentMethod = data.authorization?.brand;

        await payment.save();

        // TODO: Update order status, send confirmation email, etc.
        console.log(`Payment successful: ${payment.reference}`);
    }
};

// Helper function to handle failed payment
const handleFailedPayment = async (data: any) => {
    const payment = await Payment.findOne({ paystackReference: data.reference });

    if (payment) {
        payment.status = 'failed';
        payment.paystackResponse = data;

        await payment.save();

        console.log(`Payment failed: ${payment.reference}`);
    }
};

// Get user's payment history
export const getUserPayments = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const payments = await Payment.find({ userId })
            .sort({ createdAt: -1 })
            .select('-paystackResponse');

        return res.status(200).json({
            success: true,
            data: payments
        });

    } catch (error: any) {
        console.error("Get payments error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching payments",
            error: error.message
        });
    }
};

// Get single payment details
export const getPaymentDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const payment = await Payment.findOne({ _id: id, userId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: payment
        });

    } catch (error: any) {
        console.error("Get payment details error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching payment details",
            error: error.message
        });
    }
};

export const paymentController = {
    initializePayment,
    verifyPayment,
    paystackWebhook,
    getUserPayments,
    getPaymentDetails
};