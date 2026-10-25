import React from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { Armchair, BedDouble, CalendarDays, ChefHat, ClipboardList, CookingPot, FileClock, LayoutDashboard, LogOut, PackageCheck, PackagePlus, ReceiptText, ScanBarcode, UsersRound, Utensils } from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Reception Billing", path: "/admin/billing", icon: ReceiptText },
  { label: "Online Orders", path: "/admin/online-order", icon: PackageCheck },
  { label: "Room Booking", path: "/admin/room-booking", icon: CalendarDays },
  { label: "Staff Management", path: "/admin/staff", icon: UsersRound },
  { label: "Food Menu", path: "/admin/menu", icon: Utensils },
  { label: "Room Management", path: "/admin/rooms", icon: BedDouble },
  { label: "Restaurant Orders", path: "/admin/restaurant-orders", icon: CookingPot },
  { label: "Room Types", path: "/admin/room-types", icon: Armchair },
  { label: "Kitchen Orders", path: "/admin/kitchen", icon: ChefHat },
  { label: "Bill History", path: "/admin/bill-history", icon: FileClock },
  { label: "Restaurant Tables", path: "/admin/restaurant-tables", icon: ClipboardList },
  { label: "Product Billing", path: "/admin/general-pos", icon: ScanBarcode },
  { label: "General History", path: "/admin/general-bill-history", icon: FileClock },
  { label: "Add POS Product", path: "/admin/general-products", icon: PackagePlus },
  { label: "Create Event", path: "/admin/events", icon: CalendarDays },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { user = null; }
  if (!localStorage.getItem("token")) return <Navigate to="/" replace />;
  if (user?.role !== "admin") return <Navigate to="/rooms" replace />;
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <div className="workspace-layout workspace-admin-layout">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <h1><span><Utensils size={17} /></span> Maurya Admin</h1>
          <p>Hotel management</p>
        </div>
        <nav className="workspace-nav" aria-label="Admin navigation">
          {menuItems.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/admin"} className={({ isActive }) => `workspace-nav-link${isActive ? " active" : ""}`}>
              <span><Icon /></span><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="workspace-logout-wrap">
          <button onClick={logout} className="workspace-logout"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar">
          <div><h2>Admin workspace</h2><p>Welcome back, {user?.name || "Administrator"}</p></div>
          <span className="workspace-role-pill">Administrator</span>
        </header>
        <div className="workspace-content"><Outlet /></div>
      </main>
    </div>
  );
}
