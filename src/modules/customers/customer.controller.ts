import { Request, Response} from "express";
import validator from "validator";
import User from "../../database/models/User";
import { generateOtp } from "../../utils/otpGenerate/otp.generate";
import { hashPassword } from "../../utils/password.util.spec"
import jwt from "jsonwebtoken"
import { Role } from "../../shared/enums/user-role.enum";
import sendEmail from "../../utils/sendMail/nodeMailer";

export const UserSignUP = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        // check if user exist
        const exists = await User.findOne({ email });

        // check if all fields are provided
        if (!name || !email || !password) {
            return res.status(400).json ({
                success: false,
                message: "Please provide all data"
            })
        }

        // Validate email format
		if (!validator.isEmail(email)) {
			return res.status(400).json({
				success: false,
				message: "Please enter a valid email",
			});
		}

		// Validate password strength (at least 8 characters)
		if (password.length < 8) {
			return res.status(400).json({
				success: false,
				message: "Password must be at least 8 characters long",
			});
		}

		if (exists) {
			return res.status(409).json({
				success: false,
				message: "User already exists",
			});
		}

        // Generate new OTP and expiration
		const { otp, otpExpiration } = generateOtp();

		// **Hash the password before saving the student**
		const hashedPassword = hashPassword(password);

		// Create a new student
		const newUser = new User({
            name,
			password: hashedPassword,
			email,
			otp,
			otpExpiration,
			isEmailVerified: false,
		});

		await newUser.save();

        // Generate JWT token
		const jwtSecret = process.env.JWT_SECRET;
		if (!jwtSecret) {
			throw new Error("JWT secret is not set in environment variables");
		}

		const tokenPayload = {
			id: newUser._id,
			role: Role.USER,
			email: newUser.email,
		}

		const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: "1h" })

        // Set token as HTTP-only cookie
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict" as const,
			maxAge: 60 * 60 * 1000,
		})

		// Send OTP to the user's email
		const subject = "Email Verification OTP";
		const text = `Your OTP for email verification is: ${otp}`;

		await sendEmail(email, subject, text);

        console.log("New User Registered successfully");
		return res.status(201).json({
			success: true,
			message:
				"Registration successful. Please verify your email with the OTP sent to your email.",
			otp,
			accessToken,
			user: newUser,
		});

    } catch (error) {
		return res.status(500).json({
			message: "Server error",
			error,
		});
	}
};

// verify email
export const verifyEmail = async (req: Request, res: Response) => {
	const { email, otp } = req.body;

	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		if (user.isEmailVerified) {
			return res.status(400).json({
				success: false,
				message: "Email is already verified",
			});
		}

		// Convert OTP from request body to a number
		const otpNumber = Number(otp);

		// Check if OTP matches and the expiration has not passed
		if (
			user.otp === otpNumber &&
			user.otpExpiration &&
			new Date(user.otpExpiration).getTime() > Date.now()
		) {
			user.isEmailVerified = true;
			user.otp = undefined;
			user.otpExpiration = undefined;
			await user.save();

			return res.status(200).json({
				success: true,
				message: "Email verified successfully!",
			});
		} else {
			return res.status(400).json({
				success: false,
				message: "Invalid OTP or OTP expired",
			});
		}
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: "An error occurred while verifying email",
			error: error.message,
		});
	}
};

// Request new Otp
export const requestNewOTP = async (req: Request, res: Response) => {
	const { email } = req.body;

	try {
		// Find the user by email
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		// Generate new OTP and expiration
		const { newOtp, otpExpiration } = generateOtp();

		// Update user record with new OTP and expiration
		user.otp = newOtp;
		user.otpExpiration = otpExpiration;

		await user.save();

		// Send the new OTP to the user's email
		const subject = "New OTP for Email Verification";
		const text = `Your new OTP for email verification is: ${newOtp}`;

		await sendEmail(user.email, subject, text);

		return res.status(200).json({
			success: true,
			message: "A new OTP has been generated and sent to your email.",
			newOtp,
		});
	} catch (error: any) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "An error occurred while requesting a new OTP",
			error: error.message,
		});
	}
};

// Get all Users
export const getAllUsers = async (req: Request, res: Response) => {
	try {
		const user = await User.find();

		if (user.length === 0) {
			return res.status(404).json({
				success: false,
				message: "No user found",
			});
		}

		return res.status(200).json({
			success: true,
			data: user,
		});
	} catch (error: any) {
		console.error("Error fetching user:", error);
		return res.status(500).json({
			success: false,
			message: "An error occurred while fetching user",
			error: error.message,
		});
	}
};

// Get a single user
export const getaUser = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		const user = await User.findById(id);

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		return res.status(200).json({
			success: true,
			data: user,
		});
	} catch (error: any) {
		console.error("Error fetching user:", error);
		return res.status(500).json({
			success: false,
			message: "An error occurred while fetching the user",
			error: error.message,
		});
	}
};

export const userController = {
    UserSignUP,
    verifyEmail,
    requestNewOTP,
    getAllUsers,
    getaUser
}