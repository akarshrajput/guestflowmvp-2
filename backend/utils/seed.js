const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Clear existing data
const clearDatabase = async () => {
  try {
    await Hotel.deleteMany({});
    await Booking.deleteMany({});
    console.log('🗑️  Cleared all data');
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
};

// Create a test hotel manager
const createTestManager = async () => {
  try {
    const email = 'manager@example.com';
    const password = 'password123';
    
    // Check if user already exists in Supabase
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
    
    let userId;
    
    if (existingUser) {
      userId = existingUser.id;
      console.log(`👤 Using existing manager: ${email}`);
    } else {
      // Create user in Supabase
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation for testing
      });
      
      if (error) throw error;
      
      userId = data.user.id;
      console.log(`👤 Created test manager: ${email}`);
    }
    
    return { id: userId, email };
  } catch (error) {
    console.error('Error creating test manager:', error);
    process.exit(1);
  }
};

// Create sample hotels with rooms
const createSampleHotels = async (managerId) => {
  const hotels = [
    {
      name: 'Grand Paradise Hotel',
      description: 'A luxurious 5-star hotel with stunning ocean views',
      location: {
        address: '123 Ocean Drive',
        city: 'Miami',
        state: 'Florida',
        country: 'USA',
        postalCode: '33139',
        coordinates: {
          type: 'Point',
          coordinates: [-80.1300, 25.7617],
        },
      },
      contact: {
        phone: '+1 (555) 123-4567',
        email: 'info@grandparadise.com',
        website: 'https://grandparadise.com',
      },
      manager: managerId,
      amenities: ['pool', 'spa', 'restaurant', 'gym', 'wifi'],
      checkInTime: '15:00',
      checkOutTime: '12:00',
      rooms: [
        {
          number: '101',
          type: 'Deluxe King',
          price: 299,
          maxGuests: 2,
          amenities: ['tv', 'minibar', 'safe', 'ac'],
          isAvailable: true,
        },
        {
          number: '102',
          type: 'Deluxe Twin',
          price: 279,
          maxGuests: 2,
          amenities: ['tv', 'minibar', 'safe', 'ac'],
          isAvailable: true,
        },
        {
          number: '201',
          type: 'Executive Suite',
          price: 499,
          maxGuests: 3,
          amenities: ['tv', 'minibar', 'safe', 'ac', 'balcony', 'ocean_view'],
          isAvailable: true,
        },
      ],
    },
    {
      name: 'Mountain View Lodge',
      description: 'A cozy lodge with breathtaking mountain views',
      location: {
        address: '456 Alpine Road',
        city: 'Aspen',
        state: 'Colorado',
        country: 'USA',
        postalCode: '81611',
        coordinates: {
          type: 'Point',
          coordinates: [-106.8172, 39.1911],
        },
      },
      contact: {
        phone: '+1 (555) 987-6543',
        email: 'info@mountainviewlodge.com',
        website: 'https://mountainviewlodge.com',
      },
      manager: managerId,
      amenities: ['restaurant', 'bar', 'wifi', 'parking', 'hot_tub'],
      checkInTime: '16:00',
      checkOutTime: '11:00',
      rooms: [
        {
          number: '101',
          type: 'Standard Queen',
          price: 199,
          maxGuests: 2,
          amenities: ['tv', 'heating', 'mountain_view'],
          isAvailable: true,
        },
        {
          number: '102',
          type: 'Deluxe King',
          price: 249,
          maxGuests: 2,
          amenities: ['tv', 'heating', 'fireplace', 'mountain_view'],
          isAvailable: true,
        },
      ],
    },
  ];

  try {
    const createdHotels = await Hotel.insertMany(hotels);
    console.log(`🏨 Created ${createdHotels.length} hotels`);
    return createdHotels;
  } catch (error) {
    console.error('Error creating sample hotels:', error);
    throw error;
  }
};

// Create sample bookings
const createSampleBookings = async (hotels) => {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  
  const twoWeeksLater = new Date(nextWeek);
  twoWeeksLater.setDate(nextWeek.getDate() + 14);
  
  const bookings = [
    {
      hotel: hotels[0]._id,
      room: hotels[0].rooms[0]._id,
      guest: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
      },
      checkIn: nextWeek,
      checkOut: twoWeeksLater,
      numberOfGuests: 2,
      totalAmount: 299 * 7, // 7 nights
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'credit_card',
      specialRequests: 'Late check-in after 8 PM please',
    },
    {
      hotel: hotels[1]._id,
      room: hotels[1].rooms[1]._id,
      guest: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1 (555) 987-6543',
      },
      checkIn: nextWeek,
      checkOut: twoWeeksLater,
      numberOfGuests: 2,
      totalAmount: 249 * 7, // 7 nights
      status: 'confirmed',
      paymentStatus: 'pending',
      paymentMethod: 'credit_card',
      specialRequests: 'Would like a room with a view if possible',
    },
  ];

  try {
    const createdBookings = await Booking.insertMany(bookings);
    console.log(`📅 Created ${createdBookings.length} sample bookings`);
    return createdBookings;
  } catch (error) {
    console.error('Error creating sample bookings:', error);
    throw error;
  }
};

// Main function to run the seed script
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearDatabase();
    
    const manager = await createTestManager();
    const hotels = await createSampleHotels(manager.id);
    await createSampleBookings(hotels);
    
    console.log('✅ Database seeded successfully!');
    console.log('\n🔑 Test Manager Credentials:');
    console.log(`   Email: ${manager.email}`);
    console.log('   Password: password123');
    console.log('\n🚀 Start the server with: npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed script
seedDatabase();
