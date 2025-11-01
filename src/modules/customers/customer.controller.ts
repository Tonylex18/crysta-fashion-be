import { Request, Response} from "express";
import validator from "validator";
import User from "../../database/models/User";
import DeliveryInformation from "../../database/models/DeliveryAddress";
import { generateOtp } from "../../utils/otpGenerate/otp.generate";
import { hashPassword } from "../../utils/password.util.spec"
import jwt from "jsonwebtoken"
import { Role } from "../../shared/enums/user-role.enum";
import sendEmail from "../../utils/sendMail/nodeMailer";
import comparePasswords from "../../utils/compare-password/compare-password.handler";

// Login a user
export const UserLogin = async (req: Request, res: Response) => {
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
            role: "USER",
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

		const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: "7d" })

        // Set token as HTTP-only cookie
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict" as const,
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

// Get user profile
export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const user = await User.findById(userId).select('-password -otp -otpExpiration');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error: any) {
        console.error("Get profile error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred getting user profile",
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
            role: "USER",
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

// Delivery Information
export const addDeliveryInformation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        console.log(userId);
        const { firstName, lastName, address, cityTown, zipCode, mobile, email } = req.body;

        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        // Validate all required fields
        if (!firstName || !lastName || !address || !cityTown || !zipCode || !mobile || !email) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Validate mobile number (basic validation)
        if (!validator.isMobilePhone(mobile, 'any')) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid mobile number"
            });
        }

        // Validate zip code (basic validation - adjust based on your country)
        if (zipCode.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid zip code"
            });
        }

        // Check if delivery information already exists for this user
    
        const existingInfo = await DeliveryInformation.findOne({ userId });

        if (existingInfo) {
            existingInfo.firstName = firstName;
            existingInfo.lastName = lastName;
            existingInfo.address = address;
            existingInfo.cityTown = cityTown;
            existingInfo.zipCode = zipCode;
            existingInfo.mobile = mobile;
            existingInfo.email = email;
            existingInfo.updatedAt = new Date();

            await existingInfo.save();

            return res.status(200).json({
                success: true,
                message: "Delivery information updated successfully",
                data: existingInfo
            });
        }

        // Create new delivery information
        const newDeliveryInfo = new DeliveryInformation({
            userId,
            firstName,
            lastName,
            address,
            cityTown,
            zipCode,
            mobile,
            email
        });

        await newDeliveryInfo.save();

        return res.status(201).json({
            success: true,
            message: "Delivery information saved successfully",
            data: newDeliveryInfo
        });

    } catch (error: any) {
        console.error("Add delivery information error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while saving delivery information",
            error: error.message
        });
    }
};

// Get delivery details
export const getDeliveryInformation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const deliveryInfo = await DeliveryInformation.findOne({ userId });

        if (!deliveryInfo) {
            return res.status(404).json({
                success: false,
                message: "No delivery information found"
            });
        }

        return res.status(200).json({
            success: true,
            data: deliveryInfo
        });

    } catch (error: any) {
        console.error("Get delivery information error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching delivery information",
            error: error.message
        });
    }
};

// Update delivery information
export const updateDeliveryInformation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { firstName, lastName, address, cityTown, zipCode, mobile, email } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        // Validate email if provided
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Validate mobile if provided
        if (mobile && !validator.isMobilePhone(mobile, 'any')) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid mobile number"
            });
        }

        const deliveryInfo = await DeliveryInformation.findOne({ userId });

        if (!deliveryInfo) {
            return res.status(404).json({
                success: false,
                message: "No delivery information found"
            });
        }

        // Update only provided fields
        if (firstName) deliveryInfo.firstName = firstName;
        if (lastName) deliveryInfo.lastName = lastName;
        if (address) deliveryInfo.address = address;
        if (cityTown) deliveryInfo.cityTown = cityTown;
        if (zipCode) deliveryInfo.zipCode = zipCode;
        if (mobile) deliveryInfo.mobile = mobile;
        if (email) deliveryInfo.email = email;
        deliveryInfo.updatedAt = new Date();

        await deliveryInfo.save();

        return res.status(200).json({
            success: true,
            message: "Delivery information updated successfully",
            data: deliveryInfo
        });

    } catch (error: any) {
        console.error("Update delivery information error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating delivery information",
            error: error.message
        });
    }
};



export const userController = {
    UserSignUP,
    verifyEmail,
    requestNewOTP,
    getAllUsers,
    getaUser,
    UserLogin,
    getUserProfile,
    refreshToken,
	addDeliveryInformation,
	getDeliveryInformation,
	updateDeliveryInformation
}