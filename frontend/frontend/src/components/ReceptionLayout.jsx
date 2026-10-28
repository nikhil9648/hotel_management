
import React from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  PackageCheck,
  CalendarDays,
  Utensils,
  CookingPot,
  FileClock,
  ScanBarcode,
  History,
  LogOut,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/reception", icon: LayoutDashboard, end: true },
  { label: "Reception Billing", path: "/reception/billing", icon: ReceiptText },
  { label: "Online Orders", path: "/reception/online-orders", icon: PackageCheck },
  { label: "Room Booking", path: "/reception/room-booking", icon: CalendarDays },
  { label: "Food Menu", path: "/reception/food-menu", icon: Utensils },
  { label: "Restaurant Orders", path: "/reception/restaurant-orders", icon: CookingPot },
  { label: "Bill History", path: "/reception/bill-history", icon: FileClock },
  { label: "Product Billing", path: "/reception/product-billing", icon: ScanBarcode },
  { label: "General History", path: "/reception/general-history", icon: History },
];

export default function ReceptionLayout() {
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const role = String(user?.role || "").toLowerCase();

  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace />;
  }

  if (!["receptionist", "admin", "manager"].includes(role)) {
    return <Navigate to="/" replace />;
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div className="workspace-layout workspace-admin-layout">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <h1>Reception</h1>
          <p>Hotel management</p>
        </div>

        <nav className="workspace-nav" aria-label="Reception navigation">
          {menuItems.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? " active" : ""}`
              }
            >
              <span><Icon size={19} /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="workspace-logout-wrap">
          <button onClick={logout} className="workspace-logout">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <h2>Reception workspace</h2>
            <p>Welcome, {user?.name || "Receptionist"}</p>
          </div>
          <span className="workspace-role-pill">
            {role === "admin" || role === "manager" ? role : "Receptionist"}
          </span>
        </header>

        <div className="workspace-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
