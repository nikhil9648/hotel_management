import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import PayNow from "../components/PayNow";
import { cancelBooking, getMyBookings } from "../services/bookingService";
import "../styles/CustomerExperience.css";

const prettyStatus = (value) =>
  String(value || "pending")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function MyBookings({ onPaymentSuccess }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMyBookings();
      if (data.success) setBookings(data.bookings || []);
      else setError(data.message || "Unable to fetch your bookings.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to fetch your bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?"))
      return;
    try {
      setCancellingId(bookingId);
      const data = await cancelBooking(bookingId);
      if (data.success) {
        window.alert("Booking cancelled successfully.");
        await fetchBookings();
      } else window.alert(data.message || "Unable to cancel booking.");
    } catch (err) {
      window.alert(err.response?.data?.message || "Unable to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="cx-page cx-record-page cx-bookings-page">
      <header className="cx-topbar cx-record-topbar">
        <Link to="/" className="cx-brand">
          <span className="cx-brand-mark">
            <UtensilsCrossed size={19} />
          </span>
          <span>
            MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span>
          </span>
        </Link>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/rooms">Rooms</Link>
          <Link to="/contact">Contact us</Link>
          <Link to="/my-orders">My orders</Link>
          <Link className="is-active" to="/my-bookings">
            My bookings
          </Link>
        </nav>
        <Link to="/profile" className="cx-record-profile">
          My account <ArrowRight size={15} />
        </Link>
      </header>
      <section className="cx-record-hero cx-booking-record-hero">
        <div>
          <span className="cx-kicker cx-kicker-light">
            YOUR HOME AWAY FROM HOME
          </span>
          <h1>
            Stay a little.
            <br />
            <em>Feel a lot.</em>
          </h1>
          <p>Your reservations and upcoming Maurya moments, all together.</p>
        </div>
        <div className="cx-record-hero-mark">
          <CalendarDays size={56} />
          <span>
            YOUR
            <br />
            STAY
            <br />
            AWAITS
          </span>
        </div>
      </section>
      <section className="cx-record-content">
        <div className="cx-record-heading">
          <div>
            <span className="cx-kicker">YOUR STAYS</span>
            <h2>My bookings</h2>
            <p>
              {loading
                ? "Gathering your reservations…"
                : `${bookings.length} ${bookings.length === 1 ? "stay" : "stays"} on your account`}
            </p>
          </div>
          <button
            className="cx-refresh-button"
            onClick={fetchBookings}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "cx-spin" : ""} /> Refresh
          </button>
        </div>
        {error && (
          <div className="cx-state-card">
            <h3>We couldn’t load your bookings</h3>
            <p>{error}</p>
            <button
              className="cx-button cx-button-orange"
              onClick={fetchBookings}
            >
              Try again
            </button>
          </div>
        )}
        {loading && (
          <div className="cx-booking-list">
            {[1, 2].map((item) => (
              <div
                className="cx-food-skeleton cx-booking-skeleton"
                key={item}
              />
            ))}
          </div>
        )}
        {!loading && !error && bookings.length === 0 && (
          <div className="cx-state-card cx-orders-empty">
            <span className="cx-empty-icon">
              <BedDouble size={25} />
            </span>
            <h3>Your Maurya stay starts here</h3>
            <p>
              You don’t have a room booking yet. Find a room and make space for
              a little time away.
            </p>
            <Link to="/rooms" className="cx-button cx-button-orange">
              Explore available rooms <ArrowRight size={16} />
            </Link>
          </div>
        )}
        {!loading && !error && bookings.length > 0 && (
          <div className="cx-booking-list">
            {bookings.map((booking, index) => {
              const status = String(
                booking.bookingStatus || "pending",
              ).toLowerCase();
              const paymentStatus = String(
                booking.paymentStatus || "pending",
              ).toLowerCase();
              const canShowCheckInOtp =
                paymentStatus === "paid" &&
                status !== "checked_out" &&
                status !== "cancelled";
              return (
                <article
                  className="cx-stay-card"
                  key={booking._id}
                  style={{ "--card-index": index }}
                >
                  <div className="cx-stay-card-head">
                    <div>
                      <span className="cx-kicker">RESERVATION</span>
                      <h3>
                        {booking.bookingNumber ||
                          `#${String(booking._id).slice(-7).toUpperCase()}`}
                      </h3>
                    </div>
                    <div className="cx-stay-statuses">
                      <span className={`cx-status-pill ${status}`}>
                        {prettyStatus(status)}
                      </span>
                      <span className={`cx-status-pill ${paymentStatus}`}>
                        {prettyStatus(paymentStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="cx-stay-details">
                    <div className="cx-stay-detail">
                      <span>
                        <BedDouble size={18} />
                      </span>
                      <div>
                        <small>ROOM</small>
                        <b>Room {booking.room?.roomNumber || "—"}</b>
                        <em>
                          {booking.room?.roomType?.name || "Hotel Maurya"}
                          {booking.room?.floor
                            ? ` · Floor ${booking.room.floor}`
                            : ""}
                        </em>
                      </div>
                    </div>
                    <div className="cx-stay-detail">
                      <span>
                        <CalendarDays size={18} />
                      </span>
                      <div>
                        <small>YOUR DATES</small>
                        <b>
                          {shortDate(booking.checkInDate)} –{" "}
                          {shortDate(booking.checkOutDate)}
                        </b>
                        <em>{booking.numberOfNights || 0} night(s)</em>
                      </div>
                    </div>
                    <div className="cx-stay-detail">
                      <span>
                        <Users size={18} />
                      </span>
                      <div>
                        <small>GUEST</small>
                        <b>{booking.guestDetails?.name || "Guest"}</b>
                        <em>
                          {booking.guestDetails?.email || "Guest details"}
                        </em>
                      </div>
                    </div>
                  </div>
                  <div className="cx-stay-card-foot">
                    <div>
                      <small>TOTAL STAY</small>
                      <b>
                        ₹
                        {Number(booking.totalAmount || 0).toLocaleString(
                          "en-IN",
                        )}
                      </b>
                    </div>
                    <div className="cx-stay-actions">
                      {paymentStatus !== "paid" && status !== "cancelled" && (
                        <PayNow
                          bookingId={booking._id}
                          onPaymentSuccess={(result) => {
                            onPaymentSuccess?.(result);
                            fetchBookings();
                          }}
                        />
                      )}
                      {status !== "cancelled" && status !== "checked_out" && (
                        <button
                          type="button"
                          className="cx-cancel-stay"
                          onClick={() => handleCancel(booking._id)}
                          disabled={cancellingId === booking._id}
                        >
                          {cancellingId === booking._id
                            ? "Cancelling…"
                            : "Cancel booking"}
                        </button>
                      )}
                      {paymentStatus === "paid" && (
                        <span className="cx-paid-note">
                          <Check size={15} /> Payment complete
                        </span>
                      )}
                      {canShowCheckInOtp && booking.checkInOtp && (
                        <div className="cx-checkin-otp">
                          <small>CHECK-IN OTP</small>
                          <strong>{booking.checkInOtp}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <footer className="cx-footer">
          <span className="cx-brand-mark">
            <UtensilsCrossed size={17} />
          </span>
          <span>We look forward to welcoming you.</span>
          <Link to="/rooms">
            Find a room <ArrowRight size={14} />
          </Link>
        </footer>
      </section>
    </main>
  );
}
