// Fallback data for when SQLite is not available
const fallbackData = {
  categories: [
    { id: 'cat1', name: 'Electronics', description: 'Latest electronic gadgets and devices' },
    { id: 'cat2', name: 'Fashion', description: 'Trendy clothing and accessories' },
    { id: 'cat3', name: 'Home & Garden', description: 'Everything for your home and garden' },
    { id: 'cat4', name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear' }
  ],
  collections: [
    { id: 'col1', name: 'Summer Collection', description: 'Fresh summer styles and trends' },
    { id: 'col2', name: 'Winter Collection', description: 'Cozy winter essentials' },
    { id: 'col3', name: 'Premium Line', description: 'Our most exclusive products' }
  ],
  products: [
    { id: 'prod1', name: 'Smartphone Pro', description: 'Latest flagship smartphone', price: 999.99 },
    { id: 'prod2', name: 'Designer T-Shirt', description: 'Premium cotton t-shirt', price: 49.99 },
    { id: 'prod3', name: 'Coffee Maker', description: 'Automatic coffee maker', price: 149.99 },
    { id: 'prod4', name: 'Running Shoes', description: 'Professional running shoes', price: 129.99 }
  ]
};

module.exports = fallbackData;
