import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, MapPin, RefreshCw, Search, Users, Wifi } from "lucide-react";
import "../styles/CustomerExperience.css";

const Rooms = () => {
    const navigate = useNavigate();
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    const searchRooms = async (event) => {
        event?.preventDefault(); setMessage("");
        if (!checkInDate || !checkOutDate) { setMessage("Please select both check-in and check-out dates."); return; }
        if (checkOutDate <= checkInDate) { setMessage("Check-out should be after check-in."); return; }
        try {
            setLoading(true); setHasSearched(true);
            const response = await axios.get("http://localhost:5000/api/bookings/available-rooms", {
                params: { checkInDate, checkOutDate },
                headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            });
            if (response.data.success) { setRooms(response.data.rooms || []); if (!(response.data.rooms || []).length) setMessage("No rooms are available for these dates. Try another stay window."); }
        } catch (error) { setMessage(error.response?.data?.message || "Unable to search rooms. Please try again."); }
        finally { setLoading(false); }
    };

    const handleBookRoom = (room) => navigate("/book-room", { state: { room, checkInDate, checkOutDate } });
    const roomImage = (room) => { const image = room.image || room.roomType?.image || room.roomType?.images?.[0]; return image ? (/^https?:\/\//i.test(image) ? image : `http://localhost:5000${image.startsWith("/") ? "" : "/"}${image}`) : "/images/hotel-maurya.jpg"; };

    return <main className="cx-page cx-rooms-page">
        <header className="cx-topbar cx-profile-topbar"><Link to="/" className="cx-brand"><span className="cx-brand-mark"><BedDouble size={20} /></span><span>MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span></span></Link><nav><Link to="/">Home</Link><Link to="/menu">Menu</Link><Link className="is-active" to="/rooms">Rooms</Link></nav><Link to="/profile" className="cx-record-profile">My account <ArrowRight size={15} /></Link></header>
        <section className="cx-rooms-hero"><img src="/images/hotel-maurya.jpg" alt="Hotel Maurya" /><div className="cx-rooms-hero-shade" /><div className="cx-rooms-hero-copy"><span className="cx-kicker cx-kicker-light">A MORE THOUGHTFUL WAY TO STAY</span><h1>Make room for<br /><em>something wonderful.</em></h1><p>Your dates, your pace, and a little more room to enjoy the journey.</p><div className="cx-rooms-perks"><span><Check size={15} /> Thoughtful comfort</span><span><Check size={15} /> Maurya hospitality</span></div></div><div className="cx-rooms-location"><MapPin size={16} /><span>HOTEL MAURYA<small>A place to feel at home</small></span></div></section>
        <section className="cx-rooms-content">
            <form className="cx-room-search-panel" onSubmit={searchRooms}>
                <div className="cx-room-search-heading"><span className="cx-search-icon"><CalendarDays size={21} /></span><div><span className="cx-kicker">PLAN YOUR STAY</span><h2>Find your room</h2><p>Choose your dates to see what’s available.</p></div></div>
                <div className="cx-room-search-fields"><label>CHECK IN<input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} required /></label><span className="cx-date-connector" aria-hidden="true">→</span><label>CHECK OUT<input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} min={checkInDate || new Date().toISOString().slice(0, 10)} required /></label><button type="submit" className="cx-button cx-button-orange" disabled={loading}>{loading ? <><RefreshCw size={16} className="cx-spin" /> Finding rooms…</> : <><Search size={17} /> Search availability</>}</button></div>
                {message && <p className={`cx-room-message ${rooms.length ? "" : "is-error"}`} role="status">{message}</p>}
            </form>
            {hasSearched && !loading && rooms.length > 0 && <div className="cx-room-results-head"><div><span className="cx-kicker">YOUR STAY OPTIONS</span><h2>Rooms for your dates</h2></div><span>{rooms.length} {rooms.length === 1 ? "room" : "rooms"} available</span></div>}
            {!hasSearched && <div className="cx-room-inspiration"><span className="cx-kicker">A STAY THAT FEELS LIKE YOURS</span><h2>Slow down. Settle in.<br /><em>We’ll take care of the rest.</em></h2><p>Check your dates to explore rooms and choose the right space for your stay.</p></div>}
            {hasSearched && !loading && rooms.length > 0 && <div className="cx-room-grid">{rooms.map((room, index) => <article className="cx-room-card" key={room._id} style={{ "--card-index": index }}><div className="cx-room-image"><img src={roomImage(room)} alt={`Room ${room.roomNumber}`} onError={(event) => { event.currentTarget.src = "/images/hotel-maurya.jpg"; }} /><span>AVAILABLE FOR YOUR DATES</span></div><div className="cx-room-card-body"><span className="cx-kicker">{room.roomType?.name || "MAURYA ROOM"}</span><h3>Room {room.roomNumber}</h3><div className="cx-room-amenities"><span><MapPin size={14} /> Floor {room.floor ?? "—"}</span><span><Users size={14} /> Up to {room.roomType?.capacity || 2} guests</span><span><Wifi size={14} /> A comfortable stay</span></div><div className="cx-room-price-row"><span><b>₹{Number(room.price || room.roomType?.basePrice || 0).toLocaleString("en-IN")}</b><small> / night</small></span><button className="cx-button cx-button-orange" onClick={() => handleBookRoom(room)}>Choose room <ArrowRight size={16} /></button></div></div></article>)}</div>}
            {hasSearched && !loading && !rooms.length && message && <div className="cx-room-empty"><span className="cx-empty-icon"><BedDouble size={25} /></span><h3>No rooms found this time</h3><p>{message}</p><button className="cx-button cx-button-outline" onClick={() => { setHasSearched(false); setMessage(""); }}>Change dates</button></div>}
        </section>
    </main>;
};

export default Rooms;
