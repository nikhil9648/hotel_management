
import React from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";

const menuItems = [
    { label: "Dashboard", path: "/waiter", icon: "📊" },
    { label: "Tables", path: "/waiter/tables", icon: "🪑" },
    { label: "Create Order", path: "/waiter/create-order", icon: "🍽️" },
    { label: "Active Orders", path: "/waiter/orders", icon: "📋" },
];

export default function WaiterLayout() {
    const navigate = useNavigate();

    let user = null;

    try {
        user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        user = null;
    }

    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" replace />;
    }

    if (user?.role !== "waiter") {
        return <Navigate to="/" replace />;
    }

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
        window.location.reload();
    };

    return (
        <div className="flex min-h-screen bg-slate-100">
            <aside className="w-64 shrink-0 bg-slate-900 p-5 text-white">
                <h1 className="mb-8 text-xl font-bold">
                    🍽️ Waiter Panel
                </h1>

                <nav className="space-y-2">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/waiter"}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-lg px-4 py-3 ${
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-300 hover:bg-slate-800"
                                }`
                            }
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <button
                    onClick={logout}
                    className="mt-10 w-full rounded-lg bg-red-600 px-4 py-3 hover:bg-red-700"
                >
                    Logout
                </button>
            </aside>

            <main className="min-w-0 flex-1 p-6">
                <Outlet />
            </main>
        </div>
    );
}
