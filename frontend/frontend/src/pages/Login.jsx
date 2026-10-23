import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UtensilsCrossed } from "lucide-react";
import { loginUser } from "../services/authService";
import "../styles/CustomerExperience.css";

const normalizeRole = (role) => String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
const getDashboardPath = (role) => ({ admin: "/admin", manager: "/admin", receptionist: "/admin/billing", waiter: "/waiter", kitchen: "/kitchen", accountant: "/admin", hr: "/admin", delivery_boy: "/delivery/delivery-dashboard", customer: "/rooms", user: "/rooms" }[normalizeRole(role)] || "/rooms");

export default function Login({ onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault(); setError("");
        if (!email.trim() || !password) { setError("Email and password are required."); return; }
        setLoading(true);
        try {
            const response = await loginUser(email.trim(), password);
            const payload = response?.data || response;
            const user = payload?.user || payload?.data?.user;
            const token = payload?.token || payload?.accessToken || payload?.data?.token;
            if (!user || !token) { setError(payload?.message || "Login details were not returned. Please try again."); return; }
            localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(user));
            onLogin?.(user); navigate(getDashboardPath(user.role), { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Unable to log in. Check your details and try again.");
        } finally { setLoading(false); }
    };

    return <main className="cx-login-page">
        <section className="cx-login-visual">
            <Link to="/" className="cx-login-back"><ArrowLeft size={16} /> Back to Hotel Maurya</Link>
            <div className="cx-login-brand"><span className="cx-brand-mark"><UtensilsCrossed size={21} /></span><span>HOTEL MAURYA</span></div>
            <div className="cx-login-copy"><span className="cx-kicker cx-kicker-light">A WARM WELCOME, EVERY TIME</span><h1>Your place<br />is <em>waiting.</em></h1><p>Settle in, find your favourites, and make yourself at home.</p></div>
            <div className="cx-login-photo"><img src="/images/hotel-maurya.jpg" alt="Hotel Maurya" /><div className="cx-login-photo-caption"><span>GOOD FOOD. GOOD STAYS.</span><b>Made memorable at Maurya.</b></div></div>
            <div className="cx-login-visual-foot">HOSPITALITY, WITH HEART <span>✳</span></div>
        </section>
        <section className="cx-login-form-side"><div className="cx-login-form-wrap">
            <div className="cx-login-mobile-brand"><span className="cx-brand-mark"><UtensilsCrossed size={19} /></span> HOTEL MAURYA</div>
            <span className="cx-kicker">WELCOME BACK</span><h2>Good to see<br />you again.</h2><p className="cx-login-subtitle">Sign in to continue to your account.</p>
            <form onSubmit={handleSubmit} className="cx-login-form">
                <label htmlFor="login-email">Email address</label><div className="cx-input-wrap"><Mail size={18} /><input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
                <label htmlFor="login-password">Password</label><div className="cx-input-wrap"><LockKeyhole size={18} /><input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required /><button type="button" className="cx-reveal-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                {error && <div className="cx-login-error" role="alert">{error}</div>}
                <button className="cx-button cx-button-orange cx-login-submit" type="submit" disabled={loading}>{loading ? <><span className="cx-button-spinner" /> Signing you in…</> : <>Sign in <ArrowRight size={18} /></>}</button>
            </form>
            <p className="cx-login-signup">New to Hotel Maurya? <Link to="/signup">Create an account</Link></p>
            <div className="cx-login-help">Your stay, your table, your Maurya. <span>✳</span></div>
        </div></section>
    </main>;
}
