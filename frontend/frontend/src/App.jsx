import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

// Public and Customer Pages
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
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
import ContactUs from "./pages/ContactUs";

// Admin Pages
import AdminMenu from "./pages/AdminMenu";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStaff from "./pages/AdminStaff";
import AdminBookings from "./pages/AdminBookings";
// import AdminRooms from "./pages/AdminRooms";
import AdminRoomTypes from "./pages/AdminRoomTypes";
import AdminRoomBooking from "./pages/AdminRoomBooking";
import AdminLayout from "./components/AdminLayout";
import AdminRestaurantOrders from "./pages/AdminRestaurantOrders";
import OnlineOrders from "./pages/admin/OnlineOrders";
import GeneralPOS from "./pages/admin/GeneralPOS";
import GeneralProductManagement from "./pages/admin/GeneralProductManagement";
import GeneralBillHistory from "./pages/admin/GeneralBillHistory";
import RestaurantTables from "./pages/admin/RestaurantTables";
import AdminEvents from "./pages/admin/AdminEvents";

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

// Delivery Boy
import DeliveryBoyDashboard from "./delivery/DeliveryBoyDashboard";

// Event QR Staff
import StaffDashboard from "./pages/staff/StaffDashboard";
import EventScanner from "./pages/staff/EventScanner";
import EventRegistration from "./pages/EventRegistration";

function App() {
  const location = useLocation();

  // Theme
  const [theme, setTheme] = useState(() => {
    const initialTheme =
      localStorage.getItem("hotel-theme") === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = initialTheme;
    return initialTheme;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hotel-theme", theme);
  }, [theme]);

  // Login state
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );

  // Current user
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  // Normalize role
  const normalizedRole = String(currentUser?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const isCustomer = ["customer", "user"].includes(normalizedRole);

  // Dashboard path according to role
  const getDashboardPath = (role) => {
    const normalized = String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const dashboardPaths = {
      admin: "/admin",
      manager: "/admin",
      receptionist: "/reception/billing",
      waiter: "/waiter",
      kitchen: "/kitchen",
      staff: "/staff",
      accountant: "/admin",
      hr: "/admin",
      delivery_boy: "/delivery-dashboard",
      customer: "/",
      user: "/",
    };

    return dashboardPaths[normalized] || "/";
  };

  // Login callback
  const handleLogin = (user) => {
    let savedUser = user;

    if (!savedUser) {
      try {
        savedUser = JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        savedUser = null;
      }
    }

    setCurrentUser(savedUser);
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setCurrentUser(null);
    setIsLoggedIn(false);

    window.location.href = "/";
  };

  // Theme toggle
  const renderThemeToggle = (className = "theme-toggle") => (
    <button
      type="button"
      className={className}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-pressed={theme === "light"}
      onClick={() =>
        setTheme((current) => (current === "dark" ? "light" : "dark"))
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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

  // Protect customer-only pages
  const customerRoute = (element) => {
    if (!isLoggedIn) {
      return (
        <Navigate to="/login" replace state={{ from: location.pathname }} />
      );
    }

    if (!isCustomer) {
      return <Navigate to={getDashboardPath(normalizedRole)} replace />;
    }

    return element;
  };

  // Protect role-specific staff pages
  const staffRoute = (element, allowedRoles) => {
    if (!isLoggedIn) {
      return (
        <Navigate to="/login" replace state={{ from: location.pathname }} />
      );
    }

    if (!allowedRoles.includes(normalizedRole)) {
      return <Navigate to={getDashboardPath(normalizedRole)} replace />;
    }

    return element;
  };

  return (
    <div
      className={`app-root min-h-screen${isCustomer ? " customer-app" : ""}`}
    >
      {/* Staff Navbar */}
      {isLoggedIn && !isCustomer && (
        <header className="app-topbar">
          <Link to="/" className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              H
            </span>

            <span>
              <strong>Hotel &amp; Restaurant</strong>
              <small>HOSPITALITY MANAGEMENT</small>
            </span>
          </Link>

          <div className="app-account">
            <span className="account-avatar" aria-hidden="true">
              {(
                currentUser?.name ||
                currentUser?.fullName ||
                currentUser?.email ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </span>

            <span className="account-copy">
              {currentUser?.name ||
                currentUser?.fullName ||
                currentUser?.email ||
                "User"}

              <small>{currentUser?.role || "User"}</small>
            </span>

            {renderThemeToggle()}

            <button
              type="button"
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </button>
          </div>
        </header>
      )}

      {(!isLoggedIn || isCustomer) &&
        renderThemeToggle("theme-toggle theme-toggle-float")}

      <div
        className={
          isCustomer && isLoggedIn ? "customer-experience" : "app-content"
        }
      >
        <Routes>
          {/* Public Homepage */}
          <Route
            path="/"
            element={
              <Home
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            }
          />

          {/* Login */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to={getDashboardPath(normalizedRole)} replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          {/* Signup */}
          <Route
            path="/signup"
            element={
              isLoggedIn ? (
                <Navigate to={getDashboardPath(normalizedRole)} replace />
              ) : (
                <Signup />
              )
            }
          />

          {/* Customer Profile */}
          <Route path="/profile" element={customerRoute(<Profile />)} />

          {/* Public Browsing */}
          <Route path="/menu" element={<Menu />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/contact" element={<ContactUs />} />

          {/* Customer Pages */}
          <Route
            path="/booking-details"
            element={customerRoute(<BookingDetails />)}
          />

          <Route path="/book-room" element={customerRoute(<BookRoom />)} />

          <Route path="/cart" element={customerRoute(<Cart />)} />

          <Route path="/checkout" element={customerRoute(<Checkout />)} />

          <Route path="/my-orders" element={customerRoute(<MyOrders />)} />

          <Route path="/my-bookings" element={customerRoute(<MyBookings />)} />

          {/* Payment Success */}
          <Route path="/payment-success" element={<PaymentSuccess />} />

          {/* Kitchen */}
          <Route
            path="/kitchen"
            element={staffRoute(<KitchenLayout />, [
              "admin",
              "manager",
              "kitchen",
            ])}
          >
            <Route index element={<KitchenDashboard />} />
            <Route path="orders" element={<KitchenOrders />} />
          </Route>

          {/* Reception */}
          <Route
            path="/reception/billing"
            element={staffRoute(<ReceptionBilling />, [
              "admin",
              "manager",
              "receptionist",
            ])}
          />

          <Route
            path="/restaurant-bill-history"
            element={staffRoute(<RestaurantBillHistory />, [
              "admin",
              "manager",
              "receptionist",
            ])}
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={staffRoute(<AdminLayout />, ["admin", "manager"])}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="bookings" element={<AdminBookings />} />
            
<Route path="rooms" element={<AdminRoomTypes />} />


            <Route path="room-booking" element={<AdminRoomBooking />} />

            <Route
              path="restaurant-orders"
              element={<AdminRestaurantOrders />}
            />

            <Route path="online-order" element={<OnlineOrders />} />

            <Route path="general-pos" element={<GeneralPOS />} />

            <Route
              path="general-products"
              element={<GeneralProductManagement />}
            />

            <Route
              path="general-bill-history"
              element={<GeneralBillHistory />}
            />

            <Route path="events" element={<AdminEvents />} />

            <Route path="restaurant-tables" element={<RestaurantTables />} />

            <Route path="kitchen" element={<KitchenKOT />} />

            <Route path="billing" element={<ReceptionBilling />} />

            <Route path="bill-history" element={<RestaurantBillHistory />} />
          </Route>

          {/* Waiter */}
          <Route
            path="/waiter"
            element={staffRoute(<WaiterLayout />, [
              "admin",
              "manager",
              "waiter",
            ])}
          >
            <Route index element={<WaiterDashboard />} />
            <Route path="tables" element={<WaiterTables />} />
            <Route path="create-order" element={<CreateOrder />} />
            <Route path="orders" element={<WaiterOrders />} />
          </Route>

          {/* Delivery Boy Dashboard */}
          <Route
            path="/delivery-dashboard"
            element={staffRoute(<DeliveryBoyDashboard />, ["delivery_boy"])}
          />

          {/* Event QR Staff Dashboard */}
          <Route
            path="/staff"
            element={staffRoute(<StaffDashboard />, ["staff"])}
          />

          <Route
            path="/staff/event-scanner"
            element={staffRoute(<EventScanner />, ["staff"])}
          />

          <Route
            path="/events/:eventId/register"
            element={<EventRegistration />}
          />

          {/* Invalid URL */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
