import express from 'express';
import { productRoutes } from './product.controller';
import multer from '../../utils/multer/multer';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorizeRoles } from '../../shared/middleware/auth-user-roles.middleware';
import { Role } from '../../shared/enums/user-role.enum';


const ProductRoutes = express.Router();


ProductRoutes.get('/get-stats', authenticate, productRoutes.getProductStats);
ProductRoutes.get('/get-featured', productRoutes.getFeaturedProducts);
ProductRoutes.get('/low-stock', productRoutes.getLowStockProducts);
ProductRoutes.get('/out-of-stock', productRoutes.getOutOfStockProducts);
ProductRoutes.get('/search-products', productRoutes.searchProducts);
ProductRoutes.get('/category/:categoryId', productRoutes.getProductsByCategory);
ProductRoutes.patch('/bulk/update', authenticate, authorizeRoles([Role.ADMIN]), productRoutes.bulkUpdateProducts);
ProductRoutes.delete('/bulk/delete', authenticate, authorizeRoles([Role.ADMIN]), productRoutes.bulkDeleteProducts);
ProductRoutes.post('/add-product', authenticate, authorizeRoles([Role.ADMIN]),  multer.uploadFiles.fields([ { name: 'image_url', maxCount: 1 },
    { name: 'images', maxCount: 10 }, ]),
   productRoutes.addProduct);
ProductRoutes.get('/get-products', productRoutes.getAllProducts);
ProductRoutes.get('/get-single-product/:id', productRoutes.getProductById);
ProductRoutes.put('/update-product/:id', authenticate, authorizeRoles([Role.ADMIN]),  multer.uploadFiles.fields([ { name: 'image_url', maxCount: 1 },
    { name: 'images', maxCount: 10 }, ]), productRoutes.updateProduct);
ProductRoutes.patch('/update-stock/:id/stock', authenticate, authorizeRoles([Role.ADMIN]), productRoutes.updateStock);
ProductRoutes.patch('/activate-product/:id', authenticate, authorizeRoles([Role.ADMIN]), productRoutes.activateProduct);
ProductRoutes.patch('/deactivate-product/:id', authenticate, authorizeRoles([Role.ADMIN]), productRoutes.deactivateProduct);
ProductRoutes.delete('/delete-product/:id', authenticate, authorizeRoles([Role.ADMIN]), productRoutes.deleteProduct);

export default ProductRoutes;