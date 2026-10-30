# Maurya Hotel & Restaurant — Customer App

A React Native + TypeScript + Expo app for Hotel Maurya customers. It uses the existing website API and keeps the customer experience focused on dining, stays, bookings, orders and profile details.

## What is included in this first milestone

- Home screen with featured menu data from `GET /api/menu/foods?isFeatured=true`
- Login through the existing `POST /api/auth/login` endpoint
- Secure token storage using Expo SecureStore and Bearer auth on API requests
- Menu and category listing from `GET /api/menu/foods` and `GET /api/menu/categories`
- Room availability lookup through the protected `GET /api/bookings/available-rooms?checkInDate=YYYY-MM-DD&checkOutDate=YYYY-MM-DD` endpoint
- Booking creation and a customer bookings view connected to the existing booking endpoints
- Customer order history connected to `GET /api/restaurant-orders/my-orders`
- Responsive layout foundation and bottom-tab navigation for Android, iOS and tablets
- A shared Maurya cream, forest-green and warm-gold visual system across the app
- Profile sign-out and role display; non-customer accounts are directed to the staff workspace

## Setup

1. Install Node.js LTS on your computer.
2. Extract this folder to a separate location; do not place it inside the website's frontend or backend folders.
3. Open this folder in VS Code.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to a reachable backend API URL.
6. Start Expo:

   ```bash
   npm start
   ```

7. Install Expo Go on your phone and scan the QR code for development. For native builds later, use EAS Build.

## API URL guidance

- Android emulator: `http://10.0.2.2:5000/api`
- Physical Android/iPhone on the same Wi-Fi: `http://YOUR_COMPUTER_LAN_IP:5000/api`
- iOS simulator: `http://localhost:5000/api`
- Deployed backend: `https://your-real-domain.example/api`

`localhost` on a physical phone points to the phone itself, not your computer. If the backend only accepts browser-origin requests or local network access is blocked, connectivity may need network configuration. This starter does not edit backend CORS or any backend files; if a server-side change appears necessary, stop and discuss it first.

## Important limitations in this milestone

- Menu browsing and order history are connected; mobile food cart and order submission are not yet implemented.
- Room availability lookup, booking creation and Razorpay checkout are connected. Payment checkout requires a native development build and is not available in Expo Go.
- Login uses the existing general `/api/auth/login` endpoint, but this app only accepts customer accounts. Staff screens stay in the web workspace; backend authorization remains authoritative.
- Room availability endpoint requires authentication and both dates, as implemented by the existing backend.
- Images returned as relative `/uploads/...` paths are resolved against the server origin.

## Backend safety

This project is intentionally separate. Do not copy mobile code into the website's frontend or backend. Do not put backend secrets, JWT secrets, MongoDB credentials, Razorpay secrets, or mail credentials into the mobile `.env`; Expo public environment variables are bundled into the app.
