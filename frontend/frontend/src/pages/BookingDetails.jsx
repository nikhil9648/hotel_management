import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, Clock3, Users, UtensilsCrossed } from "lucide-react";
import PayNow from "../components/PayNow";
import "../styles/CustomerExperience.css";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";
const humanize = (value) => String(value || "Pending").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function BookingDetails() {
    const location = useLocation();
    const navigate = useNavigate();
    const booking = location.state?.booking;

    const header = <header className="cx-topbar cx-record-topbar"><Link to="/" className="cx-brand"><span className="cx-brand-mark"><UtensilsCrossed size={19} /></span><span>MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span></span></Link><nav><Link to="/">Home</Link><Link to="/menu">Menu</Link><Link to="/rooms">Rooms</Link><Link to="/contact">Contact us</Link><Link to="/my-bookings">My bookings</Link></nav><Link to="/profile" className="cx-record-profile">My account <ArrowRight size={15} /></Link></header>;

    if (!booking) return <main className="cx-page cx-confirm-page">{header}<div className="cx-state-card cx-confirm-missing"><span className="cx-empty-icon"><BedDouble size={25} /></span><h3>Booking details aren’t available</h3><p>Choose your dates and room again to start a reservation.</p><Link to="/rooms" className="cx-button cx-button-orange">Find a room <ArrowRight size={16} /></Link></div></main>;

    const paymentPending = String(booking.paymentStatus).toLowerCase() === "pending";
    const paymentPaid = String(booking.paymentStatus).toLowerCase() === "paid";
    const rows = [
        ["Room", `Room ${booking.room?.roomNumber || "—"}${booking.room?.roomType?.name ? ` · ${booking.room.roomType.name}` : ""}`],
        ["Floor", booking.room?.floor ?? "—"],
        ["Check-in", formatDate(booking.checkInDate)],
        ["Check-out", formatDate(booking.checkOutDate)],
        ["Guests", `${booking.adults || 1} adult(s)${booking.children ? ` · ${booking.children} child(ren)` : ""}`],
        ["Stay length", `${booking.numberOfNights || 0} night(s)`],
    ];

    return <main className="cx-page cx-confirm-page">
        {header}
        <section className="cx-confirm-hero"><span className="cx-confirm-check"><Check size={28} /></span><span className="cx-kicker cx-kicker-light">YOUR STAY IS RESERVED</span><h1>One lovely stay<br /><em>to look forward to.</em></h1><p>Your room reservation has been created. Keep this booking number handy.</p></section>
        <section className="cx-confirm-layout">
            <article className="cx-confirm-main-card"><div className="cx-confirm-booking-number"><span><small>BOOKING NUMBER</small><b>{booking.bookingNumber || "Reservation confirmed"}</b></span><span className="cx-status-pill confirmed">{humanize(booking.bookingStatus)}</span></div><div className="cx-confirm-row-grid">{rows.map(([label, value], index) => <div className="cx-confirm-row" key={label}><span className="cx-confirm-row-icon">{index === 0 ? <BedDouble size={17} /> : index < 4 ? <CalendarDays size={17} /> : <Users size={17} />}</span><span><small>{label.toUpperCase()}</small><b>{value}</b></span></div>)}</div><div className="cx-confirm-total"><span><small>ROOM CHARGES</small><b>₹{Number(booking.roomCharges || 0).toLocaleString("en-IN")}</b></span><span><small>TAX</small><b>₹{Number(booking.taxAmount || 0).toLocaleString("en-IN")}</b></span><span className="grand"><small>TOTAL AMOUNT</small><b>₹{Number(booking.totalAmount || 0).toLocaleString("en-IN")}</b></span></div></article>
            <aside className="cx-confirm-side"><span className="cx-kicker">PAYMENT & NEXT STEPS</span><h2>Almost all set.</h2><div className="cx-confirm-status"><small>PAYMENT STATUS</small><span className={`cx-status-pill ${paymentPaid ? "paid" : "pending"}`}>{humanize(booking.paymentStatus)}</span></div>{paymentPending && <div className="cx-confirm-pay"><p>Complete your payment of <b>₹{Number(booking.totalAmount || 0).toLocaleString("en-IN")}</b> to finish your reservation.</p><PayNow bookingId={booking._id} onPaymentSuccess={(data) => navigate("/payment-success", { state: { booking: data.booking, payment: data.payment } })} /></div>}{paymentPaid && <div className="cx-paid-banner"><Check size={17} /> Payment completed. Thank you!</div>}<div className="cx-confirm-tip"><Clock3 size={16} /><span>Your booking details are saved in <b>My bookings</b>.</span></div><Link to="/my-bookings" className="cx-confirm-text-link">View my bookings <ArrowRight size={15} /></Link></aside>
        </section>
        <div className="cx-confirm-bottom-actions"><button onClick={() => navigate("/rooms")} className="cx-button cx-button-outline"><ArrowLeft size={16} /> Back to rooms</button><Link to="/menu" className="cx-button cx-button-orange">Explore dining <ArrowRight size={16} /></Link></div>
    </main>;
}
