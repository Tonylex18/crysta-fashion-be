import cors, { CorsOptions } from "cors";
import { Application } from "express";


const corsOptions: CorsOptions = {
	credentials: true,
	origin: ["http://localhost:5173", "http://localhost:5174"],
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization"],
  };
  

const handleCors = (app: Application) => {
	app.use(cors(corsOptions));
};

export default handleCors;
