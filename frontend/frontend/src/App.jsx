
import { useState } from "react";

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
    // ==========================================
    // LOGIN STATE
    // ==========================================

    const [isLoggedIn, setIsLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("user") || "null"
            );
        } catch {
            return null;
        }
    });

    // ==========================================
    // LOGIN CALLBACK
    // ==========================================

    const handleLogin = (user) => {
        setCurrentUser(user);
        setIsLoggedIn(true);
    };

    // ==========================================
    // LOGOUT
    // ==========================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setCurrentUser(null);
        setIsLoggedIn(false);
    };

    // ==========================================
    // LOGIN PAGE
    // ==========================================

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    // ==========================================
    // LOGGED-IN APPLICATION
    // ==========================================

    return (
        <div className="app-root min-h-screen">
            {/* Shared hospitality navigation; all existing links and logout action remain available. */}
            <div className="app-topbar">
                <Link
                    to="/rooms"
                    className="brand-lockup"
                >
                    <span className="brand-mark" aria-hidden="true">H</span>
                    <span><strong>Hotel &amp; Restaurant</strong><small>HOSPITALITY MANAGEMENT</small></span>
                </Link>

                <nav className="app-navigation" aria-label="Main navigation">
                    <Link to="/rooms" className="app-nav-link">
                        <span>Stay</span>
                    </Link>
                    <Link to="/menu" className="app-nav-link">
                        <span>Dining</span>
                    </Link>
                    <Link to="/cart" className="app-nav-link">
                        <span>Cart</span>
                    </Link>
                    <Link to="/my-orders" className="app-nav-link">
                        <span>Orders</span>
                    </Link>
                    <Link to="/my-bookings" className="app-nav-link">
                        <span>Bookings</span>
                    </Link>
                </nav>

                <div className="app-account">
                    <span className="account-avatar" aria-hidden="true">
                        {(currentUser?.name || currentUser?.fullName || currentUser?.email || "U").charAt(0).toUpperCase()}
                    </span>
                    <span className="account-copy">
                        {currentUser?.name ||
                            currentUser?.fullName ||
                            currentUser?.email ||
                            "User"}
                        <small>{currentUser?.role || "Guest"}</small>
                    </span>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="logout-button"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* APPLICATION ROUTES */}
            <main className="app-content">
            <Routes>
                {/* HOME */}
                <Route
                    path="/"
                    element={<Navigate to="/rooms" replace />}
                />

                {/* HOTEL ROOMS */}
                <Route
                    path="/rooms"
                    element={<Rooms />}
                />

                {/* BOOKING DETAILS */}
                <Route
                    path="/booking-details"
                    element={<BookingDetails />}
                />

                {/* BOOK ROOM */}
                <Route
                    path="/book-room"
                    element={<BookRoom />}
                />

                {/* CUSTOMER MENU */}
                <Route
                    path="/menu"
                    element={<Menu />}
                />

                {/* CUSTOMER CART */}
                <Route
                    path="/cart"
                    element={<Cart />}
                />

                {/* CHECKOUT */}
                <Route
                    path="/checkout"
                    element={<Checkout />}
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
                    element={<MyOrders />}
                />

                {/* CUSTOMER BOOKINGS */}
                <Route
                    path="/my-bookings"
                    element={<MyBookings />}
                />

                {/* PAYMENT SUCCESS */}
                <Route
                    path="/payment-success"
                    element={<PaymentSuccess />}
                />

                {/* INVALID URL */}
                <Route
                    path="*"
                    element={<Navigate to="/rooms" replace />}
                />
            </Routes>
            </main>
        </div>
    );
}

export default App;
