# ConsultBook - Expert Consultation Booking Platform

A comprehensive web application for booking and managing consultations with verified experts. Built with Next.js, Firebase, and MongoDB.

## Features

### Multi-Role Authentication System
- *Client Registration & Login* - Book appointments with consultants
- *Consultant Registration* - Apply to become a verified consultant
- *Admin Dashboard* - Approve consultant applications
- *Secure Authentication* with Firebase Auth

### User Management
- *Profile Management* - Upload photos, update information
- *Role-based Access Control* - Different dashboards for each user type
- *Account Verification* - Admin approval workflow for consultants

### Appointment System
- *Smart Booking* - Find and book consultants by specialty, location, price
- *Multiple Consultation Modes* - In-person, virtual, phone consultations
- *Appointment Management* - Cancel, reschedule with notifications
- *Payment Integration* - Track payment status and amounts

### Real-time Messaging
- *Client-Consultant Chat* - Direct messaging between users
- *Unread Message Counts* - Visual indicators for new messages
- *Real-time Updates* - Instant message delivery with Firebase

### Review & Rating System
- *Post-Consultation Reviews* - Rate and review completed sessions
- *Consultant Ratings* - Average ratings displayed on profiles
- *Review Management* - Track review history and feedback

### Notification System
- *Real-time Notifications* - Appointment updates, cancellations, reschedules
- *Unread Indicators* - Visual badges for unread notifications
- *Notification History* - Track all system alerts

### Analytics & Reporting
- *Dashboard Statistics* - Appointment counts, earnings, ratings
- *Consultant Metrics* - Track consultation history and performance
- *Client History* - View past appointments and reviews

### Admin Tools
- *Application Review* - Approve/reject consultant applications
- *Certificate Verification* - View uploaded credentials
- *User Management* - Monitor platform activity
- *Test Data Generator* - Development tools for testing

## Tech Stack

### Frontend
- *Next.js 14* - React framework with App Router
- *TypeScript* - Type-safe development
- *Tailwind CSS* - Utility-first styling
- *shadcn/ui* - Modern component library
- *Lucide React* - Beautiful icons

### Backend
- *Firebase* - Authentication and real-time database
- *MongoDB* - Primary database with GridFS for file storage
- *Next.js API Routes* - Serverless backend functions

### Key Libraries
- *Firebase SDK* - Authentication and Firestore
- *MongoDB Driver* - Database operations
- *GridFS* - File upload and storage
- *React Hooks* - State management

## Installation

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Firebase project

### 1. Clone the Repository
\\\`bash
git clone https://github.com/sharmin2020331076/Consultation_Booking_System.git
cd consultbook
\\\`

### 2. Install Dependencies
\\\`bash
yarn install
\\\`

### 3. Environment Setup
Create a .env.local file in the root directory:

\\\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/consultbook
# or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/consultbook
\\\`

### 4. Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Copy your config values to .env.local

### 5. MongoDB Setup
- *Local MongoDB*: Install and run MongoDB locally
- *MongoDB Atlas*: Create a cloud database and get connection string

### 6. Run the Application
\\\`bash
yarn dev
\\\`

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Usage Guide

### For Clients
1. *Register* as a client with email and password
2. *Complete Profile* - Add photo and contact information
3. *Find Consultants* - Search by specialty, location, price
4. *Book Appointments* - Select date, time, and consultation mode
5. *Manage Bookings* - View, reschedule, or cancel appointments
6. *Message Consultants* - Direct communication
7. *Leave Reviews* - Rate completed consultations

### For Consultants
1. *Apply* with credentials and certificates
2. *Wait for Approval* - Admin reviews application
3. *Complete Profile* - Add bio, rates, availability
4. *Manage Schedule* - Set available time slots
5. *Handle Appointments* - Accept, reschedule, or cancel
6. *Communicate* - Message clients directly
7. *Track Earnings* - Monitor consultation income

### For Admins
1. *Login* with admin credentials
2. *Review Applications* - Approve or reject consultants
3. *Verify Credentials* - Check uploaded certificates
4. *Monitor Platform* - Track users and activity
5. *Generate Test Data* - Use development tools

## Project Structure

\\\`
consultbook/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── files/               # File management
│   │   └── upload/              # File upload
│   ├── admin/                   # Admin pages
│   ├── client/                  # Client pages
│   ├── consultant/              # Consultant pages
│   ├── dashboard/               # Role-based dashboards
│   ├── messages/                # Messaging system
│   └── book-consultant/         # Booking flow
├── components/                   # Reusable components
│   ├── ui/                      # shadcn/ui components
│   └── file-upload.tsx          # File upload component
├── lib/                         # Utilities and config
│   ├── auth-context.tsx         # Authentication context
│   ├── firebase.ts              # Firebase configuration
│   └── mongodb.ts               # MongoDB connection
└── public/                      # Static assets
\\\`

## Configuration

## Development Scripts

\\\`bash
# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Run linting
yarn lint

# Type checking
yarn type-check
\\\`

## Developers

This project was developed by:

- *Sharif Mahmud Sazid* - Registration No: 2020331042
- *Sharmin Akther* - Registration No: 2020331076
- *Jui Sultana* - Registration No: 2020331068
