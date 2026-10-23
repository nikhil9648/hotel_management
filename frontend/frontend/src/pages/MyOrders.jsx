import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock3, RefreshCw, ShoppingBag, UtensilsCrossed } from "lucide-react";
import "../styles/CustomerExperience.css";

const API = "http://localhost:5000/api";
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const titleCase = (value) => String(value || "Pending").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function MyOrders() {
    const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
    const fetchOrders = useCallback(async () => {
        try { setLoading(true); setError(""); const token = localStorage.getItem("token") || localStorage.getItem("accessToken"); if (!token) { setError("Please sign in to view your orders."); return; }
            const response = await axios.get(`${API}/restaurant-orders/my-orders`, { headers: { Authorization: `Bearer ${token}` } }); setOrders(response.data.orders || []);
        } catch (err) { setError(err.response?.data?.message || "Unable to load your orders right now."); } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    return <main className="cx-page cx-record-page">
        <header className="cx-topbar cx-record-topbar"><Link to="/" className="cx-brand"><span className="cx-brand-mark"><UtensilsCrossed size={19} /></span><span>MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span></span></Link><nav><Link to="/menu">Menu</Link><Link className="is-active" to="/my-orders">My orders</Link><Link to="/my-bookings">My bookings</Link></nav><Link to="/profile" className="cx-record-profile">My account <ArrowRight size={15} /></Link></header>
        <section className="cx-record-hero cx-order-record-hero"><div><span className="cx-kicker cx-kicker-light">A LITTLE SOMETHING DELICIOUS</span><h1>Your orders,<br /><em>all in one place.</em></h1><p>Every dish you’ve enjoyed from the Maurya kitchen, right here.</p></div><div className="cx-record-hero-mark"><ShoppingBag size={56} /><span>GOOD<br />TASTE<br />RETURNS</span></div></section>
        <section className="cx-record-content"><div className="cx-record-heading"><div><span className="cx-kicker">YOUR TABLE, YOUR HISTORY</span><h2>Order history</h2><p>{loading ? "Gathering your orders…" : `${orders.length} ${orders.length === 1 ? "order" : "orders"} on your account`}</p></div><button className="cx-refresh-button" onClick={fetchOrders} disabled={loading}><RefreshCw size={16} className={loading ? "cx-spin" : ""} /> Refresh</button></div>
            {error && <div className="cx-state-card"><h3>We couldn’t load your orders</h3><p>{error}</p><button className="cx-button cx-button-orange" onClick={fetchOrders}>Try again</button></div>}
            {loading && <div className="cx-order-list">{[1,2].map((item) => <div key={item} className="cx-food-skeleton cx-order-skeleton" />)}</div>}
            {!loading && !error && orders.length === 0 && <div className="cx-state-card cx-orders-empty"><span className="cx-empty-icon"><UtensilsCrossed size={26} /></span><h3>Your next favourite is waiting</h3><p>You haven’t placed a food order yet. Explore what the kitchen is serving today.</p><Link to="/menu" className="cx-button cx-button-orange">Explore the menu <ArrowRight size={17} /></Link></div>}
            {!loading && !error && orders.length > 0 && <div className="cx-order-list">{orders.map((order, index) => <article className="cx-order-card" key={order._id} style={{ "--card-index": index }}>
                <div className="cx-order-card-head"><div><span className="cx-kicker">ORDER {order.orderNumber || String(order._id || "").slice(-6).toUpperCase()}</span><small><Clock3 size={14} />{order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Date unavailable"}</small></div><span className={`cx-status-pill ${String(order.orderStatus).toLowerCase()}`}>{titleCase(order.orderStatus)}</span></div>
                <div className="cx-order-items">{(order.items || []).map((item, i) => <div className="cx-order-item" key={item.food?._id || `${order._id}-${i}`}><span className="cx-order-item-icon"><UtensilsCrossed size={16} /></span><span className="cx-order-item-name">{item.name || item.food?.name || "Menu item"} <small>× {item.quantity}</small></span><b>₹{money(item.total ?? Number(item.price || 0) * Number(item.quantity || 0))}</b></div>)}</div>
                <div className="cx-order-card-foot"><div className="cx-order-meta"><span>Payment <b>{titleCase(order.paymentStatus)}</b></span><span>Type <b>{titleCase(order.orderType)}</b></span>{order.table?.tableNumber && <span>Table <b>{order.table.tableNumber}</b></span>}</div><div className="cx-order-total"><small>ORDER TOTAL</small><b>₹{money(order.totalAmount)}</b></div></div>
            </article>)}</div>}
            <footer className="cx-footer"><span className="cx-brand-mark"><UtensilsCrossed size={17} /></span><span>Good food has a way of bringing us back.</span><Link to="/menu">Order again <ArrowRight size={14} /></Link></footer>
        </section>
    </main>;
}
