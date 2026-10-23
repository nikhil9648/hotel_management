import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BedDouble, Check, Clock3, Mail, MapPin, MessageCircle, Phone, UtensilsCrossed } from "lucide-react";
import "../styles/CustomerExperience.css";

export default function ContactUs() {
    const [topic, setTopic] = useState("Room reservation");
    const [message, setMessage] = useState("");
    const [notice, setNotice] = useState("");

    const prepareInquiry = async (event) => {
        event.preventDefault();
        const inquiry = `Hotel Maurya enquiry\nTopic: ${topic}\n\n${message.trim()}`;
        try {
            if (navigator.share) await navigator.share({ title: "Hotel Maurya enquiry", text: inquiry });
            else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(inquiry); setNotice("Your enquiry is copied. You can now share it with the Hotel Maurya team."); }
            else setNotice("Please copy your enquiry and share it with the Hotel Maurya team.");
        } catch (error) {
            if (error.name !== "AbortError") setNotice("We couldn't open the share option. Please try again.");
        }
    };

    const quickLinks = [
        { icon: <BedDouble size={21} />, title: "Room reservations", text: "Check room availability or plan an upcoming stay.", link: "/rooms", label: "Explore rooms" },
        { icon: <UtensilsCrossed size={21} />, title: "Dining & menu", text: "Browse the Maurya kitchen menu and order favourites.", link: "/menu", label: "Explore menu" },
        { icon: <Clock3 size={21} />, title: "Existing booking", text: "Review your room bookings and food orders.", link: "/profile", label: "View my account" },
    ];

    return <main className="cx-page cx-contact-page">
        <header className="cx-topbar cx-profile-topbar"><Link to="/" className="cx-brand"><span className="cx-brand-mark"><UtensilsCrossed size={20} /></span><span>MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span></span></Link><nav><Link to="/">Home</Link><Link to="/menu">Menu</Link><Link to="/rooms">Rooms</Link><Link className="is-active" to="/contact">Contact us</Link></nav><Link to="/profile" className="cx-record-profile">My account <ArrowRight size={15} /></Link></header>
        <section className="cx-contact-hero"><span className="cx-kicker cx-kicker-light">WE’RE HERE TO HELP</span><h1>Every good stay<br />starts with a <em>hello.</em></h1><p>Planning a visit, placing an order or have a question? Choose the right place to start, and we’ll make it easy.</p><div className="cx-contact-hero-meta"><span><MapPin size={15} /> HOTEL MAURYA</span><span>HOSPITALITY, WITH HEART</span></div></section>
        <section className="cx-contact-content">
            <div className="cx-contact-grid">{quickLinks.map((item, index) => <article className="cx-contact-card" key={item.title} style={{ "--card-index": index }}><span className="cx-contact-icon">{item.icon}</span><h2>{item.title}</h2><p>{item.text}</p><Link to={item.link}>{item.label} <ArrowRight size={15} /></Link></article>)}</div>
            <div className="cx-contact-details">
                <div className="cx-contact-copy"><span className="cx-kicker">TELL US WHAT YOU NEED</span><h2>Let’s find the<br />right next step.</h2><p>Send an enquiry draft from your device’s share menu, or copy it to share with the Hotel Maurya team on your preferred channel.</p><div className="cx-contact-unconfigured"><span><Phone size={16} /></span><div><b>Front desk contact</b><small>Call and email details can be added once provided by the hotel.</small></div></div><div className="cx-contact-unconfigured"><span><Mail size={16} /></span><div><b>Direct email</b><small>No hotel email address is configured in this project yet.</small></div></div></div>
                <form className="cx-contact-form" onSubmit={prepareInquiry}><div className="cx-contact-form-title"><span className="cx-contact-icon"><MessageCircle size={20} /></span><div><span className="cx-kicker">QUICK ENQUIRY</span><h3>How can we help?</h3></div></div><label htmlFor="contact-topic">I’m reaching out about</label><select id="contact-topic" value={topic} onChange={(event) => setTopic(event.target.value)}><option>Room reservation</option><option>Food order</option><option>My booking or order</option><option>Something else</option></select><label htmlFor="contact-message">Your message</label><textarea id="contact-message" value={message} onChange={(event) => { setMessage(event.target.value); setNotice(""); }} placeholder="Tell us a little about what you need…" rows={5} required maxLength={1200} /><div className="cx-contact-form-foot"><small>{message.length}/1200</small><button className="cx-button cx-button-orange" type="submit" disabled={!message.trim()}><MessageCircle size={16} /> Share enquiry</button></div>{notice && <p className="cx-contact-notice" role="status"><Check size={15} />{notice}</p>}</form>
            </div>
            <footer className="cx-profile-footer"><Link to="/">Back to home <ArrowRight size={14} /></Link><span>MAURYA · STAY · DINE · UNWIND</span></footer>
        </section>
    </main>;
}
