import React from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { ChefHat, LayoutDashboard, LogOut, ClipboardList, Utensils } from "lucide-react";

export default function KitchenLayout() {
  const navigate = useNavigate();
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { user = null; }
  if (!localStorage.getItem("token")) return <Navigate to="/" replace />;
  if (user?.role !== "kitchen") return <Navigate to="/rooms" replace />;
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
    window.location.reload();
  };
  const items = [
    { label: "Dashboard", path: "/kitchen", icon: LayoutDashboard, end: true },
    { label: "Kitchen Orders", path: "/kitchen/orders", icon: ClipboardList },
  ];
  return (
    <div className="workspace-layout workspace-kitchen-layout">
      <aside className="workspace-sidebar">
        <div className="workspace-brand"><h1><span><ChefHat size={18} /></span> Kitchen</h1><p>Kitchen operations</p></div>
        <nav className="workspace-nav" aria-label="Kitchen navigation">
          {items.map(({ label, path, icon: Icon, end }) => <NavLink key={path} to={path} end={end} className={({ isActive }) => `workspace-nav-link${isActive ? " active" : ""}`}><span><Icon /></span><span>{label}</span></NavLink>)}
        </nav>
        <div className="workspace-logout-wrap"><button onClick={logout} className="workspace-logout"><LogOut size={16} /> Sign out</button></div>
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar"><div><h2>Kitchen workspace</h2><p>Welcome back, {user?.name || "Kitchen team"}</p></div><span className="workspace-role-pill"><Utensils size={12} /> Kitchen team</span></header>
        <div className="workspace-content"><Outlet /></div>
      </main>
    </div>
  );
}
