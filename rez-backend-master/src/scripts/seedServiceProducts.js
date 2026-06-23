const { MongoClient } = require('mongodb');

const uri = 'process.env.MONGODB_URI';
const dbName = 'test';

async function seedServiceProducts() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    // Get all service categories
    const categories = await db.collection('servicecategories').find({ isActive: true }).toArray();
    console.log('Found', categories.length, 'service categories');

    // Get a store to link products to
    const store = await db.collection('stores').findOne({ isActive: true });
    if (!store) {
      console.log('No active store found!');
      return;
    }
    console.log('Using store:', store.name);

    // Service products data for each category
    const serviceProductsData = {
      'home-service': [
        { name: 'Deep Home Cleaning', description: 'Professional deep cleaning service for your entire home', price: 1499, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
        { name: 'AC Service & Repair', description: 'Complete AC servicing, gas refill and repair', price: 699, image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400' },
      ],
      'repair': [
        { name: 'Smartphone Screen Repair', description: 'Professional screen replacement for all phone brands', price: 1299, image: 'https://images.unsplash.com/photo-1597762117709-859f744b84c3?w=400' },
        { name: 'Laptop Repair Service', description: 'Hardware and software repair for laptops', price: 899, image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400' },
      ],
      'perfume': [
        { name: 'Premium Fragrance Consultation', description: 'Personalized fragrance selection by experts', price: 499, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400' },
        { name: 'Custom Perfume Creation', description: 'Create your own signature scent', price: 2999, image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400' },
      ],
      'lifestyle': [
        { name: 'Personal Styling Session', description: 'Professional styling consultation', price: 1999, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400' },
        { name: 'Fitness Training Package', description: 'Personal trainer for 10 sessions', price: 4999, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
      ],
      'clinic': [
        { name: 'General Health Checkup', description: 'Complete health screening package', price: 1499, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
        { name: 'Dental Cleaning', description: 'Professional dental cleaning and checkup', price: 799, image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400' },
      ],
      'health': [
        { name: 'Physiotherapy Session', description: 'Professional physiotherapy treatment', price: 899, image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400' },
        { name: 'Diet Consultation', description: 'Personalized diet plan by nutritionist', price: 599, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400' },
      ],
      'hospital': [
        { name: 'Full Body Checkup', description: 'Comprehensive health examination', price: 2999, image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400' },
        { name: 'Blood Test Package', description: 'Complete blood work analysis', price: 999, image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400' },
      ],
      'cleaning': [
        { name: 'Sofa Cleaning Service', description: 'Deep cleaning for sofas and upholstery', price: 999, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
        { name: 'Carpet Shampooing', description: 'Professional carpet cleaning service', price: 799, image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400' },
      ],
    };

    let createdCount = 0;

    for (const category of categories) {
      const categoryServices = serviceProductsData[category.slug] || [];

      for (const serviceData of categoryServices) {
        const product = {
          name: serviceData.name,
          slug: serviceData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: serviceData.description,
          shortDescription: serviceData.description,
          productType: 'service',
          images: [serviceData.image],
          pricing: {
            original: serviceData.price + 200,
            selling: serviceData.price,
            discount: Math.round((200 / (serviceData.price + 200)) * 100),
            currency: 'INR',
          },
          store: store._id,
          serviceCategory: category._id,
          serviceDetails: {
            duration: 60,
            serviceType: 'home',
            maxBookingsPerSlot: 5,
            requiresAddress: true,
            requiresPaymentUpfront: false,
          },
          cashback: {
            percentage: category.cashbackPercentage || 5,
            maxAmount: 200,
            isActive: true,
          },
          ratings: {
            average: 4 + Math.random(),
            count: Math.floor(Math.random() * 100) + 10,
          },
          inventory: {
            stock: 999,
            lowStockThreshold: 10,
          },
          isActive: true,
          isDeleted: false,
          tags: ['service', category.slug, 'popular'],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Check if product already exists
        const existing = await db.collection('products').findOne({
          name: product.name,
          productType: 'service'
        });

        if (!existing) {
          await db.collection('products').insertOne(product);
          createdCount++;
          console.log('Created:', product.name, '- Category:', category.name);
        } else {
          console.log('Skipped (exists):', product.name);
        }
      }
    }

    console.log('\n=== DONE ===');
    console.log('Created', createdCount, 'new service products');

    // Verify
    const totalServices = await db.collection('products').countDocuments({ productType: 'service' });
    console.log('Total service products now:', totalServices);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

seedServiceProducts();
