import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL;

if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not defined in environment variables");
}

// Paystack API headers
const paystackHeaders = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
};

// Initialize payment
export const initializePayment = async (email: string, amount: number, metadata?: any) => {
    try {
        const amountInKobo = Math.round(amount * 100);

        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/transaction/initialize`,
            {
                email,
                amount: amountInKobo,
                metadata,
                callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
            },
            { headers: paystackHeaders }
        );

        return response.data;
    } catch (error: any) {
        console.error("Paystack initialize error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Failed to initialize payment");
    }
};

// Verify payment
export const verifyPayment = async (reference: string) => {
    try {
        const response = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
            { headers: paystackHeaders }
        );

        return response.data;
    } catch (error: any) {
        console.error("Paystack verify error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Failed to verify payment");
    }
};

// Get transaction details
export const getTransaction = async (transactionId: number) => {
    try {
        const response = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction/${transactionId}`,
            { headers: paystackHeaders }
        );

        return response.data;
    } catch (error: any) {
        console.error("Paystack get transaction error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Failed to get transaction");
    }
};

// List transactions
export const listTransactions = async (params?: {
    perPage?: number;
    page?: number;
    customer?: string;
}) => {
    try {
        const response = await axios.get(
            `${PAYSTACK_BASE_URL}/transaction`,
            {
                headers: paystackHeaders,
                params: {
                    perPage: params?.perPage || 50,
                    page: params?.page || 1,
                    customer: params?.customer,
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("Paystack list transactions error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Failed to list transactions");
    }
};

export const paystackService = {
    initializePayment,
    verifyPayment,
    getTransaction,
    listTransactions,
};