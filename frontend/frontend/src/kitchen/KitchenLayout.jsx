
import React from "react";
import {
    NavLink,
    Outlet,
    Navigate,
    useNavigate,
} from "react-router-dom";

export default function KitchenLayout() {
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

    if (user?.role !== "kitchen") {
        return <Navigate to="/rooms" replace />;
    }

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
        window.location.reload();
    };

    const menuItems = [
        { label: "Dashboard", path: "/kitchen", icon: "📊", end: true },
        { label: "Kitchen Orders", path: "/kitchen/orders", icon: "👨‍🍳" },
    ];

    return (
        <div className="min-h-screen bg-gray-100 md:flex">
            <aside className="w-full bg-slate-900 text-white md:min-h-screen md:w-64 md:shrink-0">
                <div className="border-b border-slate-700 p-5">
                    <h1 className="text-xl font-bold">👨‍🍳 Kitchen Panel</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Kitchen Operations
                    </p>
                </div>

                <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm ${
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

                <div className="p-3 md:mt-8">
                    <button
                        onClick={logout}
                        className="w-full rounded-lg bg-red-600 px-4 py-3 text-left hover:bg-red-700"
                    >
                        ↪ Logout
                    </button>
                </div>
            </aside>

            <main className="min-w-0 flex-1">
                <header className="border-b bg-white px-5 py-4">
                    <h2 className="font-semibold text-slate-800">
                        Kitchen Control Center
                    </h2>
                    <p className="text-sm text-slate-500">
                        Welcome, {user?.name || "Kitchen Staff"}
                    </p>
                </header>

                <div className="p-4 md:p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
