const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

let testToken;
let testHotelId;
let testRoomId;

const testHotel = {
  name: 'Test Hotel',
  description: 'A test hotel',
  location: {
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
    coordinates: {
      type: 'Point',
      coordinates: [0, 0],
    },
  },
  contact: {
    phone: '123-456-7890',
    email: 'test@example.com',
  },
  amenities: ['wifi', 'pool'],
  checkInTime: '15:00',
  checkOutTime: '12:00',
};

const testRoom = {
  number: '101',
  type: 'Deluxe',
  price: 199.99,
  maxGuests: 2,
  amenities: ['tv', 'ac'],
  isAvailable: true,
};

beforeAll(async () => {
  try {
    // Create a test hotel
    const hotel = await Hotel.create({
      name: 'Test Hotel',
      description: 'A test hotel',
      location: {
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
        coordinates: {
          type: 'Point',
          coordinates: [0, 0]
        }
      },
      contact: {
        email: 'test@example.com',
        phone: '123-456-7890',
        website: 'https://testhotel.com'
      },
      amenities: ['wifi', 'pool', 'gym'],
      checkInTime: '15:00',
      checkOutTime: '12:00',
      manager: 'test-user-id',
      rooms: [{
        number: '101',
        type: 'Deluxe',
        price: 199.99,
        maxGuests: 2,
        amenities: ['wifi', 'tv', 'ac'],
        isAvailable: true
      }]
    });
    
    testHotelId = hotel._id;
    testRoomId = hotel.rooms[0]._id;
    
    // Mock successful authentication
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
      
    testToken = res.body.token;
    console.log('✅ Test setup completed');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
}, 30000);

afterAll(async () => {
  await Hotel.deleteMany({});
  await Booking.deleteMany({});
  jest.clearAllMocks();
});

describe('Authentication', () => {
  describe('POST /api/auth/signup', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'newuser@example.com');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate a user and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
    });
  });
});

describe('Hotels', () => {
  describe('GET /api/hotels', () => {
    it('should return all hotels', async () => {
      const res = await request(app)
        .get('/api/hotels');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });
  });

  describe('GET /api/hotels/:id', () => {
    it('should return a single hotel', async () => {
      const res = await request(app)
        .get(`/api/hotels/${testHotelId}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', testHotelId.toString());
    });
  });
});

describe('Rooms', () => {
  describe('GET /api/hotels/:hotelId/rooms', () => {
    it('should return all rooms for a hotel', async () => {
      const res = await request(app)
        .get(`/api/hotels/${testHotelId}/rooms`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBeTruthy();
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/hotels/:hotelId/available-rooms', () => {
    it('should return available rooms for given dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const res = await request(app)
        .get(`/api/hotels/${testHotelId}/available-rooms`)
        .query({
          checkIn: tomorrow.toISOString().split('T')[0],
          checkOut: nextWeek.toISOString().split('T')[0],
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBeTruthy();
    });
  });
});

describe('Bookings', () => {
  describe('POST /api/hotels/:hotelId/bookings', () => {
    it('should create a new booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const res = await request(app)
        .post(`/api/hotels/${testHotelId}/bookings`)
        .send({
          room: testRoomId,
          guest: {
            name: 'Test Guest',
            email: 'guest@example.com',
            phone: '123-456-7890',
          },
          checkIn: tomorrow.toISOString().split('T')[0],
          checkOut: nextWeek.toISOString().split('T')[0],
          numberOfGuests: 2,
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.guest.name).toBe('Test Guest');
    });
  });
});

describe('Guest Access', () => {
  describe('GET /api/hotels/:hotelId/guest-link', () => {
    it('should generate a guest access link and QR code', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const res = await request(app)
        .get(`/api/hotels/${testHotelId}/guest-link`)
        .query({
          roomId: testRoomId,
          checkIn: tomorrow.toISOString().split('T')[0],
          checkOut: nextWeek.toISOString().split('T')[0],
          guestName: 'Test Guest',
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('qrCodeUrl');
      expect(res.body.data).toHaveProperty('guestLink');
    });
  });
});
