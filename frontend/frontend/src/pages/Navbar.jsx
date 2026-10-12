import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar({ onLogout }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };

    return (
        <nav
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "15px 30px",
                backgroundColor: "#222",
                color: "white",
            }}
        >
            {/* Logo */}
            <div>
                <Link
                    to="/rooms"
                    style={{
                        color: "white",
                        textDecoration: "none",
                        fontSize: "22px",
                        fontWeight: "bold",
                    }}
                >
                    🏨 Hotel & Restaurant
                </Link>
            </div>

            {/* Navigation Links */}
            <div
                style={{
                    display: "flex",
                    gap: "20px",
                    alignItems: "center",
                }}
            >
                <Link to="/rooms" className="nav-link">
                    🏨 Book Room
                </Link>

                <Link to="/menu" className="nav-link">
                    🍽️ Menu
                </Link>

                <Link to="/cart" className="nav-link">
                    🛒 Cart
                </Link>

                <Link to="/my-orders" className="nav-link">
                    📦 My Orders
                </Link>

                <Link to="/my-bookings" className="nav-link">
                    📋 My Bookings
                </Link>

                <button
                    onClick={handleLogout}
                    style={{
                        padding: "8px 15px",
                        cursor: "pointer",
                    }}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;