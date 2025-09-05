// Load environment variables for test environment
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

// Setup file for Jest tests
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Connect to the in-memory database before tests run
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Connected to MongoDB in-memory server for testing');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB in-memory server:', error);
    throw error;
  }
});

// Clear all test data after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Disconnect and close the database after all tests are done
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      signUp: jest.fn().mockResolvedValue({
        data: { 
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'test-access-token' }
        },
        error: null
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { 
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'test-access-token' }
        },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
    },
  }),
}));
