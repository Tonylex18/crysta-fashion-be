import express from "express";
import { categoryController } from "./category.controller";
import multer from "../../utils/multer/multer";
import { authenticate } from "../../shared/middleware/authenticate";

const categoryRoutes = express.Router();

categoryRoutes.post("/create-category", authenticate, multer.upload.single('image_url'), categoryController.createCategory);
categoryRoutes.get("/get-all-categories", categoryController.getAllCategories);
categoryRoutes.get("/get-single-category/:id", categoryController.getCategoryById);
categoryRoutes.put("/update-category/:id", authenticate, categoryController.updateCategory);
categoryRoutes.delete("/delete-category/:id", authenticate, categoryController.deleteCategory);
categoryRoutes.patch("/deactivate-category/:id", authenticate, categoryController.deactivateCategory);
categoryRoutes.patch("/activate-category/:id", authenticate, categoryController.activateCategory);
categoryRoutes.get("/get-top-level-category", authenticate, categoryController.getTopLevelCategories);
categoryRoutes.get("/get-categories-stats", authenticate, categoryController.getCategoryStats);

export default categoryRoutes;


