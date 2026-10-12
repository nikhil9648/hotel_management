import { useEffect, useState } from "react";
import {
    Routes,
    Route,
    Navigate,
    Link,
    NavLink,
    useLocation,
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
    const location = useLocation();
    const [theme, setTheme] = useState(() =>
        localStorage.getItem("hotel-theme") === "light" ? "light" : "dark"
    );

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("hotel-theme", theme);
    }, [theme]);

    const toggleTheme = (
        <button
            type="button"
            className="theme-toggle"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            aria-pressed={theme === "light"}
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {theme === "dark" ? (
                    <>
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                    </>
                ) : (
                    <path d="M20.9 13.1A8.5 8.5 0 0 1 10.9 3.1 8.5 8.5 0 1 0 20.9 13.1Z" />
                )}
            </svg>
            <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
        </button>
    );

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
        return (
            <>
                <div className="login-theme-toggle">{toggleTheme}</div>
                <Login onLogin={handleLogin} />
            </>
        );
    }

    // LOGGED-IN APPLICATION
    return (
        <div className={`app-root min-h-screen${isCustomer ? " customer-app" : ""}`}>
            {/* NAVBAR */}
            <div className={`app-topbar${isCustomer ? " customer-topbar" : ""}`}>
                <Link
                    to="/"
                    className="brand-lockup"
                >
                    <span className="brand-mark" aria-hidden="true">H</span>
                        <span><strong>Hotel &amp; Restaurant</strong><small>{isCustomer ? "YOUR STAY, CONSIDERED" : "HOSPITALITY MANAGEMENT"}</small></span>
                </Link>

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
                    {toggleTheme}

                    {/* CUSTOMER NAVIGATION ONLY */}
                    {isCustomer && (
                        <nav className="app-navigation" aria-label="Main navigation">
                            <NavLink
                                to="/rooms"
                                className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                            >
                                Stay
                            </NavLink>

                            <NavLink
                                to="/menu"
                                className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                            >
                                Dining
                            </NavLink>

                            <NavLink
                                to="/cart"
                                className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                            >
                                Cart
                            </NavLink>

                            <NavLink
                                to="/my-orders"
                                className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                            >
                                Orders
                            </NavLink>

                            <NavLink
                                to="/my-bookings"
                                className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
                            >
                                Bookings
                            </NavLink>
                        </nav>
                    )}

                    {/* LOGOUT FOR ALL ROLES */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="logout-button"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Customer-only presentation shell keeps each existing route and data workflow intact. */}
            <div className={isCustomer ? "customer-experience" : "app-content"}>
            {isCustomer && location.pathname === "/rooms" && (
                <section className="customer-welcome" aria-labelledby="customer-welcome-title">
                    <div className="customer-welcome-copy">
                        <p className="customer-eyebrow"><span /> A MORE THOUGHTFUL WAY TO STAY</p>
                        <h1 id="customer-welcome-title">Make room for <em>something wonderful.</em></h1>
                        <p>Your dates, your pace, and a little more room to enjoy the journey.</p>
                    </div>
                    <div className="welcome-orbit" aria-hidden="true">
                        <span className="orbit orbit-one" />
                        <span className="orbit orbit-two" />
                        <span className="orbit-core"><svg viewBox="0 0 48 48" fill="none"><path d="M8 30V18l16-9 16 9v12M12 28h24M16 28v10m16-10v10M9 38h30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                    </div>
                </section>
            )}
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
        </div>
    );
}

export default App;

