
import React from "react";
import { Link } from "react-router-dom";

const dashboardCards = [
    {
        title: "Assigned Tables",
        value: "—",
        description: "Tables assigned to you",
        icon: "🪑",
        color: "bg-blue-50 text-blue-700",
        path: "/waiter/tables",
    },
    {
        title: "Active Orders",
        value: "—",
        description: "Orders currently in progress",
        icon: "📋",
        color: "bg-orange-50 text-orange-700",
        path: "/waiter/orders",
    },
    {
        title: "Ready to Serve",
        value: "—",
        description: "Orders ready from the kitchen",
        icon: "🍽️",
        color: "bg-green-50 text-green-700",
        path: "/waiter/orders",
    },
    {
        title: "Available Tables",
        value: "—",
        description: "Tables available for customers",
        icon: "🪑",
        color: "bg-purple-50 text-purple-700",
        path: "/waiter/tables",
    },
];

export default function WaiterDashboard() {
    let user = null;

    try {
        user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        user = null;
    }

    const firstName = user?.name?.trim()?.split(/\s+/)[0] || "Waiter";

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-blue-600">
                        RESTAURANT OPERATIONS
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-800">
                        Welcome, {firstName}! 👋
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Manage your tables, create orders, and serve customers.
                    </p>
                </div>

                <Link
                    to="/waiter/create-order"
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                    + Create New Order
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {dashboardCards.map((card) => (
                    <Link
                        key={card.title}
                        to={card.path}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    {card.title}
                                </p>

                                <p className="mt-3 text-3xl font-bold text-slate-800">
                                    {card.value}
                                </p>
                            </div>

                            <span
                                className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${card.color}`}
                            >
                                {card.icon}
                            </span>
                        </div>

                        <p className="mt-4 text-sm text-slate-500">
                            {card.description}
                        </p>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <section>
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                    Quick Actions
                </h2>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Link
                        to="/waiter/tables"
                        className="rounded-2xl border bg-white p-6 transition hover:border-blue-400 hover:shadow-md"
                    >
                        <span className="text-3xl">🪑</span>
                        <h3 className="mt-4 font-semibold text-slate-800">
                            View Tables
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Check table availability and assignments.
                        </p>
                    </Link>

                    <Link
                        to="/waiter/create-order"
                        className="rounded-2xl border bg-white p-6 transition hover:border-blue-400 hover:shadow-md"
                    >
                        <span className="text-3xl">🍽️</span>
                        <h3 className="mt-4 font-semibold text-slate-800">
                            Create Order
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Select a table, add food items, and send the order to the kitchen.
                        </p>
                    </Link>

                    <Link
                        to="/waiter/orders"
                        className="rounded-2xl border bg-white p-6 transition hover:border-blue-400 hover:shadow-md"
                    >
                        <span className="text-3xl">🔔</span>
                        <h3 className="mt-4 font-semibold text-slate-800">
                            Track Orders
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            View kitchen progress and find orders ready to serve.
                        </p>
                    </Link>
                </div>
            </section>

            {/* Kitchen Workflow */}
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                <h2 className="text-lg font-bold text-slate-800">
                    Kitchen Order Workflow
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Create the customer's order and send it to the kitchen.
                    Monitor its progress here. Kitchen staff control preparation
                    and ready status; the waiter handles serving the food.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-medium">
                    <span className="rounded-lg bg-white px-4 py-2 text-slate-700">
                        New Order
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-lg bg-white px-4 py-2 text-orange-700">
                        Preparing
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-lg bg-white px-4 py-2 text-green-700">
                        Ready
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-lg bg-white px-4 py-2 text-blue-700">
                        Served by Waiter
                    </span>
                </div>
            </section>
        </div>
    );
}
