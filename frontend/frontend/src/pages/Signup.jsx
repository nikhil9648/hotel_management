import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound, UtensilsCrossed } from "lucide-react";
import "../styles/CustomerExperience.css";

function Signup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value }));
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault(); setError("");
        const name = formData.name.trim(); const email = formData.email.trim().toLowerCase(); const phone = formData.phone.trim();
        if (!name || !email || !phone || !formData.password) { setError("Please fill in all required fields."); return; }
        if (!/^[6-9]\d{9}$/.test(phone)) { setError("Enter a valid 10-digit Indian mobile number."); return; }
        if (formData.password.length < 6) { setError("Password must contain at least 6 characters."); return; }
        if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
        try {
            setLoading(true);
            const response = await axios.post("http://localhost:5000/api/customer-auth/register", { name, email, phone, password: formData.password });
            if (response.status === 200 || response.status === 201) navigate("/login", { replace: true, state: { message: "Account created successfully. Please log in." } });
        } catch (err) {
            const status = err.response?.status; const backendMessage = err.response?.data?.message || err.response?.data?.error;
            setError(status === 409 ? backendMessage || "This email or mobile number is already registered." : backendMessage || "Unable to create account. Please try again.");
        } finally { setLoading(false); }
    };

    return <main className="cx-login-page cx-signup-page">
        <section className="cx-login-visual cx-signup-visual">
            <Link to="/" className="cx-login-back"><ArrowLeft size={16} /> Back to Hotel Maurya</Link>
            <div className="cx-login-brand"><span className="cx-brand-mark"><UtensilsCrossed size={21} /></span><span>HOTEL MAURYA</span></div>
            <div className="cx-login-copy"><span className="cx-kicker cx-kicker-light">GOOD THINGS START HERE</span><h1>Make yourself<br /><em>at home.</em></h1><p>Create your Maurya account for stays, dining and little moments worth remembering.</p></div>
            <div className="cx-login-photo"><img src="/images/hotel-maurya.jpg" alt="Hotel Maurya" /><div className="cx-login-photo-caption"><span>YOUR MAURYA MOMENTS</span><b>Stay · Dine · Unwind.</b></div></div>
            <div className="cx-login-visual-foot">HOSPITALITY, WITH HEART <span>✳</span></div>
        </section>
        <section className="cx-login-form-side"><div className="cx-login-form-wrap cx-signup-form-wrap">
            <div className="cx-login-mobile-brand"><span className="cx-brand-mark"><UtensilsCrossed size={19} /></span> HOTEL MAURYA</div>
            <span className="cx-kicker">LET’S GET ACQUAINTED</span><h2>Create your<br />account.</h2><p className="cx-login-subtitle">One account for a more personal Maurya experience.</p>
            <form onSubmit={handleSubmit} className="cx-login-form cx-signup-form">
                <label htmlFor="name">Full name</label><div className="cx-input-wrap"><UserRound size={17} /><input id="name" type="text" name="name" placeholder="Your name" value={formData.name} onChange={handleChange} autoComplete="name" minLength={2} maxLength={100} required /></div>
                <label htmlFor="phone">Mobile number</label><div className="cx-input-wrap"><Phone size={17} /><span className="cx-phone-prefix">+91</span><input id="phone" type="tel" name="phone" placeholder="10-digit mobile number" value={formData.phone} onChange={handleChange} pattern="[6-9][0-9]{9}" maxLength={10} minLength={10} inputMode="numeric" autoComplete="tel-national" title="Enter a valid 10-digit Indian mobile number" required /></div>
                <label htmlFor="email">Email address</label><div className="cx-input-wrap"><Mail size={17} /><input id="email" type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} autoComplete="email" maxLength={254} required /></div>
                <label htmlFor="password">Password</label><div className="cx-input-wrap"><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} name="password" placeholder="At least 6 characters" value={formData.password} onChange={handleChange} autoComplete="new-password" minLength={6} required /><button type="button" className="cx-reveal-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                <label htmlFor="confirmPassword">Confirm password</label><div className="cx-input-wrap"><LockKeyhole size={17} /><input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Enter it one more time" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" minLength={6} required /><button type="button" className="cx-reveal-button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                {error && <div className="cx-login-error" role="alert">{error}</div>}
                <button type="submit" className="cx-button cx-button-orange cx-login-submit" disabled={loading}>{loading ? <><span className="cx-button-spinner" /> Creating your account…</> : <>Create account <ArrowRight size={17} /></>}</button>
            </form>
            <p className="cx-login-signup">Already with us? <Link to="/login">Sign in</Link></p>
        </div></section>
    </main>;
}

export default Signup;
