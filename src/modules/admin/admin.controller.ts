import { Request, Response } from "express"
import comparePasswords from "../../utils/compare-password/compare-password.handler";
import User from "../../database/models/User";
import validator from "validator";
import { generateOtp } from "../../utils/otpGenerate/otp.generate";
import { hashPassword } from "../../utils/password.util.spec";
import { Role } from "../../shared/enums/user-role.enum";
import sendEmail from "../../utils/sendMail/nodeMailer";
import jwt from "jsonwebtoken";

// Login a user
export const AdminLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        // Check if all fields are provided
        if (!email || !password) {
            return res.status(400).json ({
                success: false,
                message: "Please provide all data"
            })
        }
        
        // Find user by email
		let user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        // Check if the email is verified
		if (!user.isEmailVerified) {
			return res.status(403).json({
				success: false,
				message: "Email not verified. Please verify your email to login.",
			});
		}

        // Compare passwords (same logic for both user types)
		const isPasswordMatch = await comparePasswords(password, user.password);
		if (!isPasswordMatch) {
			return res.status(401).json({
				success: false,
				message: "Invalid credentials",
			});
		}

        // Generate JWT
		const jwtSecret = process.env.JWT_SECRET;
		if (!jwtSecret) {
			throw new Error("JWT secret is not set in environment variables");
		}

        const tokenPayload = {
            id: user._id,
            role: "ADMIN",
            email: user.email,
        };

        const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: "7d" })

        // Set token as HTTP-only cookie
        const tokenOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict" as const,
		};

        // Send cookie and response with user data and type
		res.status(200).cookie("accessToken", accessToken, tokenOptions).json({
			success: true,
			message: "Login successful",
			accessToken,
			user,
		});
    } catch (error: any) {
        console.error("Login error:", error);
		return res.status(500).json({
			success: false,
			message: "An error occurred signing in",
			error: error.message,
		});
    }
}

// User Sign Up
export const AdminSignUP = async (req: Request, res: Response) => {
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
			role: Role.ADMIN,
			email: newUser.email,
		}

		const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: "7d" })

        // Set token as HTTP-only cookie
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict" as const,
			maxAge: 7 * 24 * 60 * 60 * 1000,
		})

		// Send OTP to the user's email
		const subject = "Email Verification OTP";
		const text = `Your OTP for email verification is: ${otp}`;

		await sendEmail(email, subject, text);

        console.log("New User Registered successfully");
		console.log("New User: ", newUser)
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

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT secret is not set in environment variables");
        }

        let decoded: any;
        try {
            // Try to decode the token, even if it's expired
            decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true });
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        // Find user by ID from the token
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Generate new JWT token
        const tokenPayload = {
            id: user._id,
            role: "ADMIN",
            email: user.email,
        };

        const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: "7d" });

        res.status(200).json({
            success: true,
            accessToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                created_at: user.createdAt
            }
        });
    } catch (error: any) {
        console.error("Refresh token error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred refreshing token",
            error: error.message,
        });
    }
};

// Admin signout
export const adminSignout = async (req: Request, res: Response) => {
	try {
		if (!req.user?.id) {
			return res.status(401).json({
				success: false,
				message: "Aunthentication required",
			})
		}

		// clear the access token cookie
		res.cookie("accessToken", "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict" as const,
			expires: new Date(0),
			path: "/",
		})

		return res.status(200).json({
			success: true,
			message: "Signed out successfully",
		})

	} catch (error: any) {
		console.error("Admin signout error:", error);
		return res.status(500).json({
			success: false,
			message: "An error occurred while signing out", 
			error: error.message,
		});
	}
}

export const adminController = {
    AdminLogin,
    AdminSignUP,
    verifyEmail,
    requestNewOTP,
	refreshToken,
	adminSignout
}