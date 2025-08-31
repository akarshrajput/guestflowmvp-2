# GuestFlow API

Backend API for GuestFlow - A modern hotel management system with guest access features.

## Features

- **Hotel Management**: Create, read, update, and delete hotel information
- **Room Management**: Manage rooms, availability, and pricing
- **Booking System**: Handle guest bookings and reservations
- **Guest Access**: Generate QR codes and access links for guests
- **Authentication**: Secure authentication using Supabase
- **RESTful API**: Clean and consistent API design

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Supabase Auth
- **Validation**: Joi and express-validator
- **QR Code Generation**: qrcode
- **Environment**: Dotenv for environment variables

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn
- Supabase account

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/guestflow-backend.git
   cd guestflow-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following variables:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development
   
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/guestflow
   
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # JWT
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=30d
   
   # Frontend URL for guest links
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5000`

## API Documentation

### Authentication

| Endpoint            | Method | Description          | Auth Required |
|---------------------|--------|----------------------|---------------|
| `/api/auth/signup`  | POST   | Register a new user   | No            |
| `/api/auth/login`   | POST   | Login user           | No            |
| `/api/auth/logout`  | POST   | Logout user          | Yes           |
| `/api/auth/me`      | GET    | Get current user     | Yes           |

### Hotels

| Endpoint                    | Method | Description                | Auth Required |
|-----------------------------|--------|----------------------------|---------------|
| `/api/hotels`               | GET    | Get all hotels             | No            |
| `/api/hotels`               | POST   | Create a new hotel         | Yes (Manager) |
| `/api/hotels/:id`           | GET    | Get a single hotel         | No            |
| `/api/hotels/:id`           | PUT    | Update a hotel             | Yes (Manager) |
| `/api/hotels/:id`           | DELETE | Delete a hotel             | Yes (Manager) |
| `/api/hotels/:id/rooms`     | GET    | Get all rooms in a hotel   | No            |
| `/api/hotels/:id/bookings`  | GET    | Get all bookings for hotel | Yes (Manager) |

### Rooms

| Endpoint                                  | Method | Description                | Auth Required |
|-------------------------------------------|--------|----------------------------|---------------|
| `/api/hotels/:hotelId/rooms`              | POST   | Add a room to a hotel      | Yes (Manager) |
| `/api/hotels/:hotelId/rooms/:roomId`      | GET    | Get a single room          | No            |
| `/api/hotels/:hotelId/rooms/:roomId`      | PUT    | Update a room              | Yes (Manager) |
| `/api/hotels/:hotelId/rooms/:roomId`      | DELETE | Delete a room              | Yes (Manager) |
| `/api/hotels/:hotelId/available-rooms`    | GET    | Get available rooms        | No            |

### Bookings

| Endpoint                                  | Method | Description                | Auth Required |
|-------------------------------------------|--------|----------------------------|---------------|
| `/api/hotels/:hotelId/bookings`           | POST   | Create a new booking       | No            |
| `/api/hotels/:hotelId/bookings`           | GET    | Get all bookings           | Yes (Manager) |
| `/api/bookings/:id`                       | GET    | Get a single booking       | No (with token)|
| `/api/bookings/:id`                       | PUT    | Update a booking           | Yes (Manager) |
| `/api/bookings/:id/cancel`                | DELETE | Cancel a booking           | No (with token)|
| `/api/hotels/:hotelId/guest-link`         | GET    | Generate guest access link | No            |

## Environment Variables

- `PORT`: Port number for the server (default: 5000)
- `NODE_ENV`: Environment (development, production, test)
- `MONGODB_URI`: MongoDB connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `JWT_SECRET`: Secret key for JWT
- `JWT_EXPIRES_IN`: JWT expiration time
- `FRONTEND_URL`: Frontend URL for guest links

## Development

### Scripts

- `npm run dev`: Start development server with nodemon
- `npm start`: Start production server
- `npm test`: Run tests (TBD)
- `npm run lint`: Lint code
- `npm run format`: Format code with Prettier
- `npm run seed`: Seed the database with sample data (TBD)

### Code Style

This project uses:
- ESLint for code linting
- Prettier for code formatting
- Airbnb JavaScript Style Guide

## Deployment

### Prerequisites

- Set up a MongoDB database (e.g., MongoDB Atlas)
- Set up a Supabase project
- Configure environment variables in production

### Steps

1. Build the application:
   ```bash
   npm install --production
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. For production, consider using PM2 or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "guestflow-api"
   ```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
