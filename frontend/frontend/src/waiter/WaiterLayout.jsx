import React from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { ClipboardList, LayoutDashboard, LogOut, Armchair, Utensils } from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/waiter", icon: LayoutDashboard },
  { label: "Tables", path: "/waiter/tables", icon: Armchair },
  { label: "Create Order", path: "/waiter/create-order", icon: Utensils },
  { label: "Active Orders", path: "/waiter/orders", icon: ClipboardList },
];

export default function WaiterLayout() {
  const navigate = useNavigate();
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { user = null; }
  if (!localStorage.getItem("token")) return <Navigate to="/" replace />;
  if (user?.role !== "waiter") return <Navigate to="/" replace />;
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
    window.location.reload();
  };
  return (
    <div className="workspace-layout workspace-waiter-layout">
      <aside className="workspace-sidebar">
        <div className="workspace-brand"><h1><span><Utensils size={17} /></span> Service team</h1><p>Guest experience</p></div>
        <nav className="workspace-nav" aria-label="Waiter navigation">
          {menuItems.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === "/waiter"} className={({ isActive }) => `workspace-nav-link${isActive ? " active" : ""}`}><span><Icon /></span><span>{label}</span></NavLink>)}
        </nav>
        <div className="workspace-logout-wrap"><button onClick={logout} className="workspace-logout"><LogOut size={16} /> Sign out</button></div>
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar"><div><h2>Service workspace</h2><p>Welcome back, {user?.name || "Service team"}</p></div><span className="workspace-role-pill">Waiter</span></header>
        <div className="workspace-content"><Outlet /></div>
      </main>
    </div>
  );
}
