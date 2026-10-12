import React, { useState } from "react";
import {
    Routes,
    Route,
    Navigate,
    Link,
} from "react-router-dom";

// Customer Pages
import Login from "./pages/Login";
import Rooms from "./pages/Rooms";
import PaymentSuccess from "./pages/PaymentSuccess";
import MyBookings from "./pages/MyBookings";
import BookRoom from "./pages/BookRoom";
import BookingDetails from "./pages/BookingDetails";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";

// Admin Pages
import AdminMenu from "./pages/AdminMenu";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStaff from "./pages/AdminStaff";
import AdminBookings from "./pages/AdminBookings";
import AdminRooms from "./pages/AdminRooms";
import AdminRoomTypes from "./pages/AdminRoomTypes";
import AdminRoomBooking from "./pages/AdminRoomBooking";
import AdminLayout from "./components/AdminLayout";

// Kitchen and Reception
import KitchenKOT from "./pages/KitchenKOT";
import ReceptionBilling from "./pages/ReceptionBilling";
import RestaurantBillHistory from "./pages/RestaurantBillHistory";

import KitchenLayout from "./kitchen/KitchenLayout";
import KitchenDashboard from "./kitchen/KitchenDashboard";
import KitchenOrders from "./kitchen/KitchenOrders";

// Waiter Pages
import WaiterLayout from "./waiter/WaiterLayout";
import WaiterDashboard from "./waiter/WaiterDashboard";
import WaiterTables from "./waiter/WaiterTables";
import CreateOrder from "./waiter/CreateOrder";
import WaiterOrders from "./waiter/WaiterOrders";

import AdminRestaurantOrders from "./pages/AdminRestaurantOrders";

function App() {
    // LOGIN STATE
    const [isLoggedIn, setIsLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    // NORMALIZE ROLE
    const normalizedRole = String(currentUser?.role || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    // CUSTOMER ONLY
    const isCustomer = ["customer", "user"].includes(normalizedRole);

    // LOGIN CALLBACK
    const handleLogin = (user) => {
        setCurrentUser(user);
        setIsLoggedIn(true);
    };

    // LOGOUT
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setCurrentUser(null);
        setIsLoggedIn(false);
    };

    // LOGIN PAGE
    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    // LOGGED-IN APPLICATION
    return (
        <div className="min-h-screen bg-gray-50">
            {/* NAVBAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 p-4 text-white">
                <Link
                    to="/"
                    className="text-xl font-bold hover:text-gray-300"
                >
                    🏨 Hotel &amp; Restaurant
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-2 text-sm text-gray-200">
                        {currentUser?.name ||
                            currentUser?.fullName ||
                            currentUser?.email ||
                            "User"}
                        {currentUser?.role
                            ? ` (${currentUser.role})`
                            : ""}
                    </span>

                    {/* CUSTOMER NAVIGATION ONLY */}
                    {isCustomer && (
                        <>
                            <Link
                                to="/rooms"
                                className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700"
                            >
                                🏨 Book Room
                            </Link>

                            <Link
                                to="/menu"
                                className="rounded bg-orange-600 px-4 py-2 hover:bg-orange-700"
                            >
                                🍽️ Menu
                            </Link>

                            <Link
                                to="/cart"
                                className="rounded bg-purple-600 px-4 py-2 hover:bg-purple-700"
                            >
                                🛒 Cart
                            </Link>

                            <Link
                                to="/my-orders"
                                className="rounded bg-yellow-600 px-4 py-2 hover:bg-yellow-700"
                            >
                                📦 My Orders
                            </Link>

                            <Link
                                to="/my-bookings"
                                className="rounded bg-green-600 px-4 py-2 hover:bg-green-700"
                            >
                                📋 My Bookings
                            </Link>
                        </>
                    )}

                    {/* LOGOUT FOR ALL ROLES */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* APPLICATION ROUTES */}
            <Routes>
                {/* HOME */}
                <Route
                    path="/"
                    element={
                        <Navigate
                            to={isCustomer ? "/rooms" : normalizedRole === "admin" || normalizedRole === "manager" ? "/admin" : normalizedRole === "waiter" ? "/waiter" : normalizedRole === "kitchen" ? "/kitchen" : normalizedRole === "receptionist" ? "/reception/billing" : "/rooms"}
                            replace
                        />
                    }
                />

                {/* HOTEL ROOMS */}
                <Route
                    path="/rooms"
                    element={
                        isCustomer ? (
                            <Rooms />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* BOOKING DETAILS */}
                <Route
                    path="/booking-details"
                    element={
                        isCustomer ? (
                            <BookingDetails />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* BOOK ROOM */}
                <Route
                    path="/book-room"
                    element={
                        isCustomer ? (
                            <BookRoom />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* CUSTOMER MENU */}
                <Route
                    path="/menu"
                    element={
                        isCustomer ? (
                            <Menu />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* CUSTOMER CART */}
                <Route
                    path="/cart"
                    element={
                        isCustomer ? (
                            <Cart />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* CHECKOUT */}
                <Route
                    path="/checkout"
                    element={
                        isCustomer ? (
                            <Checkout />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* KITCHEN */}
                <Route
                    path="/kitchen"
                    element={<KitchenLayout />}
                >
                    <Route
                        index
                        element={<KitchenDashboard />}
                    />

                    <Route
                        path="orders"
                        element={<KitchenOrders />}
                    />
                </Route>

                {/* RECEPTION BILLING */}
                <Route
                    path="/reception/billing"
                    element={<ReceptionBilling />}
                />

                {/* RESTAURANT BILL HISTORY */}
                <Route
                    path="/restaurant-bill-history"
                    element={<RestaurantBillHistory />}
                />

                {/* ADMIN PANEL */}
                <Route
                    path="/admin"
                    element={<AdminLayout />}
                >
                    <Route
                        index
                        element={<AdminDashboard />}
                    />

                    <Route
                        path="staff"
                        element={<AdminStaff />}
                    />

                    <Route
                        path="restaurant-orders"
                        element={<AdminRestaurantOrders />}
                    />

                    <Route
                        path="bookings"
                        element={<AdminBookings />}
                    />

                    <Route
                        path="rooms"
                        element={<AdminRooms />}
                    />

                    <Route
                        path="room-types"
                        element={<AdminRoomTypes />}
                    />

                    <Route
                        path="room-booking"
                        element={<AdminRoomBooking />}
                    />

                    <Route
                        path="menu"
                        element={<AdminMenu />}
                    />

                    <Route
                        path="kitchen"
                        element={<KitchenKOT />}
                    />

                    <Route
                        path="billing"
                        element={<ReceptionBilling />}
                    />

                    <Route
                        path="bill-history"
                        element={<RestaurantBillHistory />}
                    />
                </Route>

                {/* WAITER PANEL */}
                <Route
                    path="/waiter"
                    element={<WaiterLayout />}
                >
                    <Route
                        index
                        element={<WaiterDashboard />}
                    />

                    <Route
                        path="tables"
                        element={<WaiterTables />}
                    />

                    <Route
                        path="create-order"
                        element={<CreateOrder />}
                    />

                    <Route
                        path="orders"
                        element={<WaiterOrders />}
                    />
                </Route>

                {/* CUSTOMER ORDERS */}
                <Route
                    path="/my-orders"
                    element={
                        isCustomer ? (
                            <MyOrders />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* CUSTOMER BOOKINGS */}
                <Route
                    path="/my-bookings"
                    element={
                        isCustomer ? (
                            <MyBookings />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />

                {/* PAYMENT SUCCESS */}
                <Route
                    path="/payment-success"
                    element={<PaymentSuccess />}
                />

                {/* INVALID URL */}
                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        </div>
    );
}

export default App;

