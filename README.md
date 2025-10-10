# Crysta E-commerce Backend API

A Node.js/Express backend API for the Crysta e-commerce application.

## Features

- **Authentication**: JWT-based user authentication with signup/signin
- **Products Management**: CRUD operations for products with categories
- **Shopping Cart**: User-specific cart management
- **Orders**: Order creation and management
- **Categories**: Product categorization
- **Testimonials**: Customer reviews management
- **MongoDB Integration**: Mongoose ODM for database operations
- **Security**: Helmet, CORS, input validation

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, cors
- **Validation**: express-validator

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas account

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/crysta-ecommerce
   JWT_SECRET=your-super-secret-jwt-key-here
   FRONTEND_URL=http://localhost:5173
   ```

5. Seed the database with sample data:
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001/api`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/profile` - Get user profile (requires auth)
- `POST /api/auth/signout` - User logout

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/category/:categoryId` - Get products by category

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID

### Cart (requires authentication)
- `GET /api/cart` - Get user's cart items
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:itemId` - Update cart item quantity
- `DELETE /api/cart/items/:itemId` - Remove item from cart
- `DELETE /api/cart` - Clear entire cart

### Orders (requires authentication)
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get specific order

### Testimonials
- `GET /api/testimonials` - Get all testimonials

## Database Schema

### User
- email (unique)
- password (hashed)
- name (optional)

### Category
- name
- slug (auto-generated)
- description
- image_url

### Product
- name
- slug (auto-generated)
- description
- price
- category_id (reference)
- image_url
- images (array)
- sizes (array)
- colors (array)
- stock
- featured (boolean)

### CartItem
- user_id (reference)
- product_id (reference)
- quantity
- size
- color

### Order
- user_id (reference)
- status
- total
- shipping_address (object)

### OrderItem
- order_id (reference)
- product_id (reference)
- quantity
- size
- color
- price

### Testimonial
- name
- avatar_url
- rating (1-5)
- comment

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend URL for CORS

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- CORS configuration
- Helmet for security headers
- Input validation with express-validator
- Protected routes with authentication middleware
