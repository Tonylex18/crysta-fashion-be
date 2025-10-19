import express from 'express';
import { productRoutes } from './product.controller';
import multer from '../../utils/multer/multer';
import { authenticate } from '../../shared/middleware/authenticate';


const ProductRoutes = express.Router();


ProductRoutes.get('/get-stats', authenticate, productRoutes.getProductStats);
ProductRoutes.get('/get-featured', productRoutes.getFeaturedProducts);
ProductRoutes.get('/low-stock', productRoutes.getLowStockProducts);
ProductRoutes.get('/out-of-stock', productRoutes.getOutOfStockProducts);
ProductRoutes.get('/search-products', productRoutes.searchProducts);
ProductRoutes.get('/category/:categoryId', productRoutes.getProductsByCategory);
ProductRoutes.patch('/bulk/update', productRoutes.bulkUpdateProducts);
ProductRoutes.delete('/bulk/delete', productRoutes.bulkDeleteProducts);
ProductRoutes.post('/add-product', authenticate,  multer.uploadFiles.fields([ { name: 'image_url', maxCount: 1 },
    { name: 'images', maxCount: 10 }, ]),
   productRoutes.addProduct);
ProductRoutes.get('/get-products', productRoutes.getAllProducts);
ProductRoutes.get('/get-single-product/:id', productRoutes.getProductById);
ProductRoutes.put('/update-product/:id', authenticate, productRoutes.updateProduct);
ProductRoutes.patch('/update-stock/:id/stock', authenticate, productRoutes.updateStock);
ProductRoutes.patch('/activate-product/:id/activate', authenticate, productRoutes.activateProduct);
ProductRoutes.patch('/deactivate-product/:id/deactivate', authenticate, productRoutes.deactivateProduct);
ProductRoutes.delete('/delete-product/:id', authenticate, productRoutes.deleteProduct);

export default ProductRoutes;