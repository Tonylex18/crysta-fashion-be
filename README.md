# Crysta E-commerce Backend API

A Node.js/Express backend API for the Crysta e-commerce application.

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
   PORT=
   NODE_ENV=
   MONGODB_URI=
   JWT_SECRET=
   FRONTEND_URL=
   ```

5. Seed the database with sample data:
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```
