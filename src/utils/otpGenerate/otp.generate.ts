import crypto from 'crypto';

export const generateOtp = () => {
    const otp = crypto.randomInt(100000, 999999);
    const newOtp = crypto.randomInt(100000, 999999);
    const otpExpiration = new Date(Date.now() + 1 * 60 * 1000);
    return { otp, newOtp, otpExpiration };
};