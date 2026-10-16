import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
UserRound,
Mail,
ShieldCheck,
CalendarDays,
ShoppingBag,
ArrowLeft,
LogOut,
} from "lucide-react";
import "../styles/Profile.css";
export default function Profile() {
const navigate = useNavigate();
const [user, setUser] = useState(() => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
});

useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || !user) {
        navigate("/login", { replace: true });
    }
}, [navigate, user]);

if (!localStorage.getItem("token") || !user) {
    return null;
}

const name =
    user.name || user.fullName || "Customer";

const email = user.email || "Email not available";

const role = String(user.role || "customer")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    navigate("/", { replace: true });
    window.location.reload();
};

return (
    <main className="profile-page">
        <div className="profile-container">
            <Link to="/" className="profile-back-link">
                <ArrowLeft size={17} />
                Back to Home
            </Link>

            <section className="profile-hero">
                <div className="profile-avatar-large">
                    {name.charAt(0).toUpperCase()}
                </div>

                <div className="profile-hero-copy">
                    <span className="profile-eyebrow">
                        HOTEL MAURYA ACCOUNT
                    </span>

                    <h1>My Profile</h1>

                    <p>
                        Welcome back, {name}. Manage your account
                        and keep track of your stays and orders.
                    </p>
                </div>
            </section>

            <section className="profile-details-card">
                <div className="profile-card-heading">
                    <div>
                        <span className="profile-eyebrow">
                            YOUR ACCOUNT
                        </span>
                        <h2>Personal information</h2>
                    </div>

                    <UserRound size={23} />
                </div>

                <div className="profile-detail-row">
                    <span className="profile-detail-icon">
                        <UserRound size={19} />
                    </span>

                    <div>
                        <small>Full name</small>
                        <strong>{name}</strong>
                    </div>
                </div>

                <div className="profile-detail-row">
                    <span className="profile-detail-icon">
                        <Mail size={19} />
                    </span>

                    <div>
                        <small>Email address</small>
                        <strong>{email}</strong>
                    </div>
                </div>

                <div className="profile-detail-row">
                    <span className="profile-detail-icon">
                        <ShieldCheck size={19} />
                    </span>

                    <div>
                        <small>Account type</small>
                        <strong>{role}</strong>
                    </div>
                </div>
            </section>

            <section className="profile-shortcuts">
                <h2>My activity</h2>

                <div className="profile-shortcut-grid">
                    <Link
                        to="/my-bookings"
                        className="profile-shortcut-card"
                    >
                        <span className="profile-shortcut-icon">
                            <CalendarDays size={23} />
                        </span>

                        <strong>My Bookings</strong>

                        <small>
                            View your room bookings
                        </small>
                    </Link>

                    <Link
                        to="/my-orders"
                        className="profile-shortcut-card"
                    >
                        <span className="profile-shortcut-icon">
                            <ShoppingBag size={23} />
                        </span>

                        <strong>My Orders</strong>

                        <small>
                            Check your food orders
                        </small>
                    </Link>
                </div>
            </section>

            <button
                type="button"
                className="profile-logout-button"
                onClick={handleLogout}
            >
                <LogOut size={18} />
                Logout
            </button>
        </div>
    </main>
);

}
