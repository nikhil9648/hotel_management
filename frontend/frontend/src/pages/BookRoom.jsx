import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, Clock3, LockKeyhole, MapPin, Users, UtensilsCrossed } from "lucide-react";
import "../styles/CustomerExperience.css";

const showDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function BookRoom() {
    const location = useLocation();
    const navigate = useNavigate();
    const room = location.state?.room;
    const checkInDate = location.state?.checkInDate;
    const checkOutDate = location.state?.checkOutDate;
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", idProofType: "Aadhar", idProofNumber: "", adults: 1, children: 0, specialRequests: "" });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const header = <header className="cx-topbar cx-record-topbar"><Link to="/" className="cx-brand"><span className="cx-brand-mark"><UtensilsCrossed size={19} /></span><span>MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span></span></Link><nav><Link to="/">Home</Link><Link to="/menu">Menu</Link><Link className="is-active" to="/rooms">Rooms</Link><Link to="/contact">Contact us</Link><Link to="/my-bookings">My bookings</Link></nav><Link to="/profile" className="cx-record-profile">My account <ArrowRight size={15} /></Link></header>;

    const handleChange = (event) => { const { name, value } = event.target; setFormData((previous) => ({ ...previous, [name]: value })); setMessage(""); };
    const handleSubmit = async (event) => {
        event.preventDefault(); setMessage("");
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login", { state: { from: "/rooms" } }); return; }
        const adults = Number(formData.adults); const children = Number(formData.children);
        if (adults < 1) { setMessage("At least one adult is required."); return; }
        if (children < 0) { setMessage("Children cannot be negative."); return; }
        try {
            setLoading(true);
            const bookingData = { room: room._id, checkInDate, checkOutDate, adults, children, guestDetails: { name: formData.name.trim(), email: formData.email.trim().toLowerCase(), phone: formData.phone.trim(), address: formData.address.trim(), idProofType: formData.idProofType, idProofNumber: formData.idProofNumber.trim() }, specialRequests: formData.specialRequests.trim(), paymentMethod: "razorpay" };
            const response = await axios.post("http://localhost:5000/api/bookings", bookingData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
            if (response.data.success) navigate("/booking-details", { state: { booking: response.data.booking } });
            else setMessage(response.data.message || "Unable to create the booking.");
        } catch (error) { setMessage(error.response?.data?.message || "Unable to create the booking."); }
        finally { setLoading(false); }
    };

    if (!room || !checkInDate || !checkOutDate) return <main className="cx-page cx-reserve-page">{header}<div className="cx-state-card cx-reserve-missing"><span className="cx-empty-icon"><BedDouble size={25} /></span><h3>Choose a room to continue</h3><p>Your selected room and dates weren’t found. Head back to availability and choose your stay.</p><Link to="/rooms" className="cx-button cx-button-orange">Find a room <ArrowRight size={16} /></Link></div></main>;

    const nightCount = Math.max(1, Math.round((new Date(checkOutDate) - new Date(checkInDate)) / 86400000));
    const nightlyRate = Number(room.price || room.roomType?.basePrice || 0);

    return <main className="cx-page cx-reserve-page">
        {header}
        <section className="cx-reserve-hero"><span className="cx-kicker cx-kicker-light">JUST A FEW LITTLE DETAILS</span><h1>Let’s make this<br /><em>stay yours.</em></h1><p>Tell us who’s joining you. We’ll take care of the rest.</p><div className="cx-reserve-steps"><span className="done"><Check size={13} /> Dates</span><i /><span className="active">02 &nbsp; Guest details</span><i /><span>03 &nbsp; Confirm</span></div></section>
        <section className="cx-reserve-layout">
            <aside className="cx-reserve-summary"><div className="cx-reserve-room-art"><BedDouble size={42} /><span>YOUR ROOM AT MAURYA</span></div><span className="cx-kicker">YOUR SELECTED ROOM</span><h2>{room.roomType?.name || "Maurya Room"}</h2><p className="cx-reserve-room-number"><MapPin size={14} /> Room {room.roomNumber || "—"} {room.floor ? `· Floor ${room.floor}` : ""}</p><div className="cx-reserve-stay-dates"><div><small>CHECK IN</small><b>{showDate(checkInDate)}</b></div><ArrowRight size={16} /><div><small>CHECK OUT</small><b>{showDate(checkOutDate)}</b></div></div><div className="cx-reserve-fact"><Users size={16} /> Up to {room.roomType?.capacity || "—"} guests</div><div className="cx-reserve-fact"><Clock3 size={16} /> {nightCount} night{nightCount === 1 ? "" : "s"}</div><div className="cx-reserve-rate"><span>₹{nightlyRate.toLocaleString("en-IN")} <small>/ night</small></span><span>₹{(nightlyRate * nightCount).toLocaleString("en-IN")}</span></div><p className="cx-reserve-rate-note">Taxes and final charges are shown when your reservation is confirmed.</p></aside>
            <section className="cx-reserve-form-card"><div className="cx-reserve-form-heading"><span className="cx-kicker">GUEST INFORMATION</span><h2>Who’s checking in?</h2><p>Please use the details of the primary guest.</p></div><form onSubmit={handleSubmit} className="cx-reserve-form">
                <div className="cx-reserve-field"><label htmlFor="guest-name">Full name <i>*</i></label><input id="guest-name" name="name" value={formData.name} onChange={handleChange} autoComplete="name" placeholder="As shown on your ID" required minLength={2} /></div>
                <div className="cx-reserve-two-col"><div className="cx-reserve-field"><label htmlFor="guest-email">Email address <i>*</i></label><input id="guest-email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" required /></div><div className="cx-reserve-field"><label htmlFor="guest-phone">Mobile number <i>*</i></label><input id="guest-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} autoComplete="tel" placeholder="Your phone number" required /></div></div>
                <div className="cx-reserve-field"><label htmlFor="guest-address">Address</label><textarea id="guest-address" name="address" value={formData.address} onChange={handleChange} autoComplete="street-address" placeholder="Street, city, state" rows={2} /></div>
                <div className="cx-reserve-two-col"><div className="cx-reserve-field"><label htmlFor="guest-id-type">ID proof type</label><select id="guest-id-type" name="idProofType" value={formData.idProofType} onChange={handleChange}><option value="Aadhar">Aadhaar</option><option value="Passport">Passport</option><option value="Driving License">Driving licence</option><option value="Voter ID">Voter ID</option></select></div><div className="cx-reserve-field"><label htmlFor="guest-id-number">ID proof number</label><input id="guest-id-number" name="idProofNumber" value={formData.idProofNumber} onChange={handleChange} placeholder="Enter ID number" /></div></div>
                <div className="cx-reserve-two-col cx-guest-counts"><div className="cx-reserve-field"><label htmlFor="guest-adults">Adults <i>*</i></label><input id="guest-adults" type="number" name="adults" min="1" value={formData.adults} onChange={handleChange} required /></div><div className="cx-reserve-field"><label htmlFor="guest-children">Children</label><input id="guest-children" type="number" name="children" min="0" value={formData.children} onChange={handleChange} /></div></div>
                <div className="cx-reserve-field"><label htmlFor="guest-requests">Special requests</label><textarea id="guest-requests" name="specialRequests" value={formData.specialRequests} onChange={handleChange} placeholder="Anything that would make your stay more comfortable?" rows={3} /></div>
                {message && <div className="cx-login-error" role="alert">{message}</div>}
                <button type="submit" disabled={loading} className="cx-button cx-button-orange cx-reserve-submit">{loading ? <><span className="cx-button-spinner" /> Creating reservation…</> : <>Continue to confirmation <ArrowRight size={17} /></>}</button><p className="cx-reserve-secure"><LockKeyhole size={14} /> Your details are used to manage this reservation.</p>
            </form></section>
        </section>
        <footer className="cx-reserve-footer"><Link to="/rooms"><ArrowLeft size={15} /> Back to availability</Link><span>MAURYA · STAY · DINE · UNWIND</span></footer>
    </main>;
}
