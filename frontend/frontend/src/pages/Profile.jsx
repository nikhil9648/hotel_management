import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, LogOut, Mail, ShieldCheck, ShoppingBag, UserRound, UtensilsCrossed } from "lucide-react";
import "../styles/CustomerExperience.css";

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } });

    useEffect(() => { if (!localStorage.getItem("token") || !user) navigate("/login", { replace: true }); }, [navigate, user]);
    if (!localStorage.getItem("token") || !user) return null;

    const name = user.name || user.fullName || "Guest";
    const email = user.email || "Email not available";
    const role = String(user.role || "customer").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); navigate("/", { replace: true }); window.location.reload(); };

    return <main className="cx-page cx-profile-page">
        <header className="cx-topbar cx-profile-topbar"><Link to="/" className="cx-brand"><span className="cx-brand-mark"><UtensilsCrossed size={19} /></span><span>MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span></span></Link><Link to="/" className="cx-back-link"><ArrowLeft size={16} /> Back to home</Link></header>
        <section className="cx-profile-shell">
            <div className="cx-profile-welcome"><div className="cx-profile-ornament">✳</div><span className="cx-kicker cx-kicker-light">YOUR MAURYA MOMENTS</span><h1>A little space<br />that’s <em>all yours.</em></h1><p>Good to have you here, {name}. Your stays, meals and details are all in one place.</p><div className="cx-profile-user"><span className="cx-profile-avatar">{name.charAt(0).toUpperCase()}</span><span><b>{name}</b><small>Hotel Maurya guest</small></span></div></div>
            <div className="cx-profile-main">
                <div className="cx-section-heading"><div><span className="cx-kicker">ACCOUNT DETAILS</span><h2>Your profile</h2><p>Information connected to your account.</p></div><span className="cx-profile-shield"><ShieldCheck size={22} /></span></div>
                <div className="cx-profile-detail-card"><div className="cx-profile-detail"><span><UserRound size={19} /></span><div><small>Full name</small><b>{name}</b></div></div><div className="cx-profile-detail"><span><Mail size={19} /></span><div><small>Email address</small><b>{email}</b></div></div><div className="cx-profile-detail"><span><ShieldCheck size={19} /></span><div><small>Account type</small><b>{role}</b></div></div></div>
                <div className="cx-profile-activity-head"><div><span className="cx-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Your activity</h2></div></div>
                <div className="cx-profile-links"><Link to="/my-bookings"><span className="cx-profile-link-icon"><CalendarDays size={22} /></span><span><b>Room bookings</b><small>View your upcoming and past stays</small></span><ArrowRight size={18} /></Link><Link to="/my-orders"><span className="cx-profile-link-icon"><ShoppingBag size={22} /></span><span><b>Food orders</b><small>See what you’ve enjoyed from our kitchen</small></span><ArrowRight size={18} /></Link></div>
                <button className="cx-logout-button" onClick={logout}><LogOut size={17} /> Sign out of this account</button>
            </div>
        </section>
        <footer className="cx-profile-footer"><Link to="/menu">Explore today’s menu <ArrowRight size={14} /></Link><span>HOSPITALITY, WITH HEART <span>✳</span></span></footer>
    </main>;
}
