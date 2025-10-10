import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const MAX_PORT_RANGE = 65536;
const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z
		.string()
		.refine(
			(value) => {
				const port = parseInt(value);

				const isPortNumber = !isNaN(port);
				const isValidPortRange = port > 0 && port < MAX_PORT_RANGE;

				return isPortNumber && isValidPortRange;
			},
			{
				message: "Port is Invalid.",
			}
		)
		.optional(),
	JWT_SECRET: z.string(),
	FRONTEND_URL: z.string().refine((val) => {
		try {
			new URL(val);
			return true;
		} catch {
			return false;
		}
	}, "Invalid URL format"),
});

type Env = z.infer<typeof envSchema>;

export const ENV: Env = envSchema.parse(process.env);