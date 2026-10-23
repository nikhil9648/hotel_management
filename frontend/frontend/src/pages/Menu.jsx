import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, Search, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import "../styles/CustomerExperience.css";

const API_URL = "http://localhost:5000/api/menu";
const assetUrl = (value) => !value ? "" : /^https?:\/\//i.test(value) ? value : `http://localhost:5000${value.startsWith("/") ? "" : "/"}${value}`;
const priceOf = (food) => Number(food.discountPrice > 0 && food.discountPrice < food.price ? food.discountPrice : food.price || 0);

export default function Menu() {
    const [categories, setCategories] = useState([]);
    const [foods, setFoods] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cartCount, setCartCount] = useState(0);
    const [notice, setNotice] = useState("");

    const refreshCartCount = () => {
        try { setCartCount((JSON.parse(localStorage.getItem("cart") || "[]") || []).reduce((n, item) => n + Number(item.quantity || 0), 0)); }
        catch { setCartCount(0); }
    };

    const fetchMenu = async () => {
        try {
            setLoading(true); setError("");
            const [categoryResponse, foodResponse] = await Promise.all([axios.get(`${API_URL}/categories`), axios.get(`${API_URL}/foods`)]);
            setCategories((categoryResponse.data.categories || []).filter((category) => category.isActive !== false));
            setFoods((foodResponse.data.foodItems || []).filter((food) => food.isAvailable !== false));
        } catch (err) {
            setError(err.response?.data?.message || "We couldn't load the menu. Please try again.");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchMenu(); refreshCartCount(); window.addEventListener("cartUpdated", refreshCartCount); window.addEventListener("storage", refreshCartCount); return () => { window.removeEventListener("cartUpdated", refreshCartCount); window.removeEventListener("storage", refreshCartCount); }; }, []);

    const filteredFoods = useMemo(() => foods.filter((food) => {
        const categoryMatches = selectedCategory === "all" || String(food.category?._id || food.category) === selectedCategory;
        const text = `${food.name || ""} ${food.description || ""} ${food.category?.name || ""}`.toLowerCase();
        return categoryMatches && text.includes(query.trim().toLowerCase());
    }), [foods, selectedCategory, query]);

    const addToCart = (food) => {
        let cart = [];
        try { cart = JSON.parse(localStorage.getItem("cart") || "[]") || []; } catch { cart = []; }
        const id = String(food._id);
        const existing = cart.find((item) => String(item.food?._id || item.food || item._id || item.id) === id);
        cart = existing
            ? cart.map((item) => String(item.food?._id || item.food || item._id || item.id) === id ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item)
            : [...cart, { ...food, quantity: 1 }];
        localStorage.setItem("cart", JSON.stringify(cart));
        refreshCartCount(); window.dispatchEvent(new Event("cartUpdated"));
        setNotice(`${food.name} added to your bag`); window.setTimeout(() => setNotice(""), 2200);
    };

    return <main className="cx-page cx-menu-page">
        <section className="cx-food-hero">
            <div className="cx-hero-orbit cx-orbit-one" /><div className="cx-hero-orbit cx-orbit-two" />
            <header className="cx-topbar cx-topbar-dark">
                <Link to="/" className="cx-brand"><span className="cx-brand-mark"><UtensilsCrossed size={20} /></span><span>MAURYA<span className="cx-brand-sub">KITCHEN & STAYS</span></span></Link>
                <nav><Link to="/">Home</Link><Link className="is-active" to="/menu">Menu</Link><Link to="/my-orders">My orders</Link><Link to="/my-bookings">My bookings</Link></nav>
                <Link to="/cart" className="cx-cart-link"><ShoppingBag size={18} /> <span>Bag</span><b>{cartCount}</b></Link>
            </header>
            <div className="cx-hero-content">
                <span className="cx-kicker cx-kicker-light">GOOD FOOD, GOOD MOOD</span>
                <h1>Cravings,<br /><em>meet their match.</em></h1>
                <p>Freshly prepared favourites from the Hotel Maurya kitchen, made for your kind of day.</p>
                <label className="cx-searchbox"><Search size={20} /><input aria-label="Search food" placeholder="Search dishes, flavours or categories" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={18} /></button>}</label>
                <div className="cx-hero-note"><span className="cx-live-dot" /> Made fresh when you order <span className="cx-note-divider">·</span> <Clock3 size={15} /> Kitchen favourites</div>
            </div>
            <div className="cx-hero-art" aria-hidden="true"><div className="cx-hero-plate"><img src="/images/hotel-maurya.jpg" alt="" /></div><span className="cx-art-spark cx-spark-a">✳</span><span className="cx-art-spark cx-spark-b">✳</span><span className="cx-art-label">MADE WITH<br />A LITTLE EXTRA LOVE</span></div>
            <div className="cx-hero-bottom">A TABLE FULL OF SOMETHING GOOD <ArrowRight size={16} /></div>
        </section>

        <section className="cx-menu-content">
            <div className="cx-section-heading"><div><span className="cx-kicker">PICK YOUR CRAVING</span><h2>Explore the menu</h2><p>From comfort food to little treats worth saving room for.</p></div><span className="cx-result-count">{loading ? "Loading…" : `${filteredFoods.length} delicious ${filteredFoods.length === 1 ? "choice" : "choices"}`}</span></div>
            <div className="cx-category-rail" aria-label="Filter by category">
                <button className={`cx-category-chip ${selectedCategory === "all" ? "active" : ""}`} onClick={() => setSelectedCategory("all")}><span className="cx-category-all"><UtensilsCrossed size={19} /></span>All dishes</button>
                {categories.map((category) => <button key={category._id} className={`cx-category-chip ${selectedCategory === category._id ? "active" : ""}`} onClick={() => setSelectedCategory(category._id)}>{category.image ? <img src={assetUrl(category.image)} alt="" loading="lazy" /> : <span className="cx-category-all"><UtensilsCrossed size={19} /></span>}<span>{category.name}</span></button>)}
            </div>
            {error && <div className="cx-state-card"><h3>Menu taking a little longer</h3><p>{error}</p><button className="cx-button cx-button-orange" onClick={fetchMenu}>Try again</button></div>}
            {loading && <div className="cx-food-grid">{[1,2,3,4].map((n) => <div key={n} className="cx-food-skeleton" />)}</div>}
            {!loading && !error && filteredFoods.length === 0 && <div className="cx-state-card"><h3>{query ? "No dishes match that search" : "The kitchen is updating this menu"}</h3><p>{query ? "Try another dish name or choose a different category." : "Please check back soon for today's selection."}</p>{query && <button className="cx-button cx-button-outline" onClick={() => setQuery("")}>Clear search</button>}</div>}
            {!loading && filteredFoods.length > 0 && <div className="cx-food-grid">{filteredFoods.map((food, index) => {
                const price = priceOf(food); const hasDiscount = price < Number(food.price || 0); const image = assetUrl(food.image);
                return <article key={food._id} className="cx-food-card" style={{ "--card-index": index }}>
                    <div className="cx-food-image">{image ? <img src={image} alt={food.name} loading="lazy" /> : <div className="cx-food-image-fallback"><UtensilsCrossed size={36} /></div>}{food.isFeatured && <span className="cx-featured-tag">CHEF'S PICK</span>}<span className={`cx-diet-tag ${String(food.foodType).toLowerCase().includes("non") ? "nonveg" : "veg"}`}><i />{food.foodType || "Fresh"}</span></div>
                    <div className="cx-food-info"><div className="cx-food-category">{food.category?.name || "MAURYA KITCHEN"}</div><h3>{food.name}</h3><p>{food.description || "Prepared fresh by our kitchen, just for you."}</p><div className="cx-food-card-bottom"><div><strong>₹{price.toFixed(0)}</strong>{hasDiscount && <del>₹{Number(food.price).toFixed(0)}</del>}</div><button type="button" className="cx-add-button" onClick={() => addToCart(food)} aria-label={`Add ${food.name} to bag`}>ADD <span>+</span></button></div></div>
                </article>;
            })}</div>}
            <footer className="cx-footer"><span className="cx-brand-mark"><UtensilsCrossed size={17} /></span><span>Made with warmth at Hotel Maurya</span><Link to="/">Back to home <ArrowRight size={14} /></Link></footer>
        </section>
        {notice && <div className="cx-toast" role="status"><span>✓</span>{notice}<Link to="/cart">View bag</Link></div>}
    </main>;
}
