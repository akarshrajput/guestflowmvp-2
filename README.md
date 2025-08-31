# GuestFlow MVP - Development Plan

## Tech Stack

* **Frontend**: Next.js (React framework for SSR/SPA)
* **Backend**: Express.js with Node.js (part of MERN)
* **Database**: MongoDB (for hotel/room data)
* **Auth & Backend Services**: Supabase (handles auth, storage, and potentially replacing parts of backend)

## MVP Requirements

### 1. Hotel Manager Authentication

* Sign up / Log in with Supabase Auth (email + password)
* No auth for guests (guest access is prefixed/pre-defined)

### 2. Onboarding Flow for Hotel Manager

* After login, manager fills in details:

  * Hotel name, location, contact info
  * Number of rooms
  * Room numbering / room type info
* Store all data in Supabase (Postgres DB)

### 3. Guest Flow

* No login needed for guests
* Guests will access via prefixed link / QR code
* Guests see basic hotel info and available rooms
* Room booking flow (for MVP, this can just be a confirmation without payment)

### 4. Prototype Reference

You can view the current simple prototype here: [GuestFlow Prototype](https://app--guest-flow-894c1ced.base44.app)

## Next Steps

1. Implement Supabase Auth for hotel managers
2. Create onboarding form with Supabase DB integration
3. Define guest access flow (prefixed link/QR)
4. Build simple UI for hotel manager dashboard and guest booking page
5. Deploy MVP to Vercel
