import React from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";

const menuItems = [
    { label: "Dashboard", path: "/admin", icon: "📊" },
    { label: "Staff Management", path: "/admin/staff", icon: "👥" },
    { label: "Food Menu", path: "/admin/menu", icon: "🍽️" },
    { label: "Room Management", path: "/admin/rooms" },

    { label: "Restaurant Orders", path: "/admin/restaurant-orders", icon: "🍛" },

    { label: "Room Type Management", path: "/admin/room-types" },
    {
        label: "Room Booking",
        path: "/admin/room-booking",
    },
    { label: "Kitchen Orders", path: "/admin/kitchen", icon: "👨‍🍳" },
    { label: "Reception Billing", path: "/admin/billing", icon: "🧾" },
    { label: "Bill History", path: "/admin/bill-history", icon: "📑" },
    { label: "Product Billing", path: "/admin/general-pos" },
    { label: "General History", path: "/admin/general-bill-history" },
    { label: "Add POS Product", path: "/admin/general-products" },
];

export default function AdminLayout() {
    const navigate = useNavigate();

    let user = null;

    try {
        user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        user = null;
    }

    if (!localStorage.getItem("token")) {
        return <Navigate to="/" replace />;
    }

    if (user?.role !== "admin") {
        return <Navigate to="/rooms" replace />;
    }

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-100 md:flex">
            <aside className="w-full bg-slate-900 text-white md:min-h-screen md:w-64 md:shrink-0">
                <div className="border-b border-slate-700 p-5">
                    <h1 className="text-xl font-bold">🏨 Hotel Admin</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Management Panel
                    </p>
                </div>

                <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/admin"}
                            className={({ isActive }) =>
                                `flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${isActive
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`
                            }
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 md:mt-8">
                    <button
                        onClick={logout}
                        className="w-full rounded-lg bg-red-600 px-4 py-3 text-left font-medium hover:bg-red-700"
                    >
                        ↪ Logout
                    </button>
                </div>
            </aside>

            <main className="min-w-0 flex-1">
                <header className="flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-slate-800">
                            Admin Control Center
                        </h2>
                        <p className="text-sm text-slate-500">
                            Welcome, {user?.name || "Administrator"}
                        </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                        Admin
                    </span>
                </header>

                <div className="p-4 md:p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}