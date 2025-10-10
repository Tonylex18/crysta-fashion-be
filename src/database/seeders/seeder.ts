import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category';
import Product from '../models/Product';
import Testimonial from '../models/Testimonial';

dotenv.config();

const sampleData = {
  categories: [
    {
      name: 'Casuals',
      description: 'Comfortable everyday wear for any occasion',
      image_url: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      name: 'Formals',
      description: 'Professional attire for business and formal events',
      image_url: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      name: 'Streetwear',
      description: 'Urban fashion with attitude and style',
      image_url: 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      name: 'Accessories',
      description: 'Complete your look with our premium accessories',
      image_url: 'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=800'
    }
  ],
  products: [
    {
      name: 'Premium Cotton T-Shirt',
      description: 'Soft, breathable cotton t-shirt perfect for everyday wear',
      price: 29.99,
      image_url: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
      images: [
        'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['White', 'Black', 'Navy', 'Gray'],
      stock: 50,
      featured: true
    },
    {
      name: 'Classic Denim Jacket',
      description: 'Timeless denim jacket with modern fit and premium quality',
      price: 79.99,
      image_url: 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=400',
      images: [
        'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=400'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Blue', 'Black', 'Light Blue'],
      stock: 25,
      featured: true
    },
    {
      name: 'Business Formal Shirt',
      description: 'Crisp, professional shirt for the modern professional',
      price: 59.99,
      image_url: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400',
      images: [
        'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['White', 'Light Blue', 'Pink'],
      stock: 30,
      featured: false
    },
    {
      name: 'Urban Hoodie',
      description: 'Comfortable hoodie with street style appeal',
      price: 49.99,
      image_url: 'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=400',
      images: [
        'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=400'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black', 'Gray', 'Navy'],
      stock: 40,
      featured: true
    },
    {
      name: 'Designer Sneakers',
      description: 'Premium sneakers combining comfort and style',
      price: 129.99,
      image_url: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=400',
      images: [
        'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=400'
      ],
      sizes: ['8', '9', '10', '11', '12'],
      colors: ['White', 'Black', 'Navy'],
      stock: 20,
      featured: true
    },
    {
      name: 'Leather Belt',
      description: 'Genuine leather belt for a polished look',
      price: 39.99,
      image_url: 'https://images.pexels.com/photos/1043472/pexels-photo-1043472.jpeg?auto=compress&cs=tinysrgb&w=400',
      images: [
        'https://images.pexels.com/photos/1043472/pexels-photo-1043472.jpeg?auto=compress&cs=tinysrgb&w=400'
      ],
      sizes: ['32', '34', '36', '38', '40'],
      colors: ['Brown', 'Black'],
      stock: 35,
      featured: false
    }
  ],
  testimonials: [
    {
      name: 'Sarah Johnson',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
      rating: 5,
      comment: 'Amazing quality and fast shipping! The clothes fit perfectly and the material is so comfortable. I\'ll definitely be ordering again.'
    },
    {
      name: 'Michael Chen',
      avatar_url: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=150',
      rating: 5,
      comment: 'Great customer service and the products exceeded my expectations. The website is easy to navigate and checkout was seamless.'
    },
    {
      name: 'Emily Rodriguez',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
      rating: 4,
      comment: 'Love the style and quality! The only minor issue was the delivery time, but the products were worth the wait.'
    }
  ]
};

export const seedDatabase = async () => {
  try {
    // Clear existing data
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Testimonial.deleteMany({});
    console.log('Cleared existing data');

    // Insert categories with slugs
    const categoriesWithSlugs = sampleData.categories.map(category => ({
      ...category,
      slug: category.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    }));
    const categories = await Category.insertMany(categoriesWithSlugs);
    console.log(`Inserted ${categories.length} categories`);

    // Insert products with category references and slugs
    const productsWithCategories = sampleData.products.map((product, index) => ({
      ...product,
      category_id: categories[index % categories.length]?._id,
      slug: product.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    }));
    
    const products = await Product.insertMany(productsWithCategories);
    console.log(`Inserted ${products.length} products`);

    // Insert testimonials
    const testimonials = await Testimonial.insertMany(sampleData.testimonials);
    console.log(`Inserted ${testimonials.length} testimonials`);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};