
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function HomeProfileMenu() {
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const [open, setOpen] = useState(false);

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const closeMenu = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", closeMenu);

        return () => {
            document.removeEventListener("mousedown", closeMenu);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
        setOpen(false);

        navigate("/", { replace: true });
        window.location.reload();
    };

    const token = localStorage.getItem("token");

    // Logged-out visitor
    if (!token || !user) {
        return (
            <Link to="/login" className="home-signin-button">
                Sign In
            </Link>
        );
    }

    // Staff ke liye customer profile menu mat dikhao
    const role = String(user.role || "").toLowerCase();

    if (!["customer", "user"].includes(role)) {
        return null;
    }

    const displayName =
        user.name || user.fullName || user.email || "My Account";

    return (
        <div className="home-profile-menu" ref={menuRef}>
            <button
                type="button"
                className="home-profile-trigger"
                onClick={() => setOpen((previous) => !previous)}
                aria-expanded={open}
                aria-haspopup="menu"
            >
                <span className="home-profile-avatar">
                    {displayName.charAt(0).toUpperCase()}
                </span>

                <span className="home-profile-name">
                    {displayName}
                </span>

                <span aria-hidden="true">⌄</span>
            </button>

            {open && (
                <div className="home-profile-dropdown" role="menu">
                    <div className="home-profile-details">
                        <strong>{displayName}</strong>
                        <small>{user.email}</small>
                    </div>

                    <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                    >
                        My Profile
                    </Link>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
