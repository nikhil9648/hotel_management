import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import HomeProfileMenu from "../components/HomeProfileMenu";
import { ArrowRight, BedDouble, Check, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Search, ShoppingBag, Sparkles, Star, Utensils, X } from "lucide-react";
import "../styles/Home.css";
import "../styles/FoodOrdering.css";

const API = "http://localhost:5000/api";
const ASSET_BASE = "http://localhost:5000";

const readCart = () => {
    try {
        const cart = JSON.parse(localStorage.getItem("cart") || "[]");
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
};

const getFoodId = (item) =>
    String(item?._id || item?.foodItem?._id || item?.foodItem || item?.food?._id || item?.food || item?.foodId || item?.id || "");

const imageUrl = (image) => {
    if (!image) return "";
    if (/^(https?:)?\/\//i.test(image) || image.startsWith("data:")) return image;
    return `${ASSET_BASE}${image.startsWith("/") ? "" : "/"}${image}`;
};

const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function Home({
    isLoggedIn = Boolean(localStorage.getItem("token")),
    currentUser = null,
    onLogout,
}) {
    const [categories, setCategories] = useState([]);
    const [foods, setFoods] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState(readCart);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");

    const loadMenu = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [categoryResponse, foodResponse] = await Promise.all([
                axios.get(`${API}/menu/categories`),
                axios.get(`${API}/menu/foods`),
            ]);
            setCategories((categoryResponse.data?.categories || []).filter((item) => item.isActive !== false));
            setFoods((foodResponse.data?.foodItems || []).filter((item) => item.isAvailable !== false));
            const allFoods = foodResponse.data?.foodItems || [];
            const foodById = new Map(allFoods.map((item) => [String(item._id), item]));
            const storedCart = readCart();
            const syncedCart = storedCart.flatMap((item) => {
                const currentFood = foodById.get(getFoodId(item));
                return currentFood ? [{ ...item, ...currentFood, quantity: Number(item.quantity || 1) }] : [];
            });
            if (syncedCart.length !== storedCart.length) {
                localStorage.setItem("cart", JSON.stringify(syncedCart));
                setToast("Old menu items jo ab available nahi hain, basket se remove kar diye.");
                window.setTimeout(() => setToast(""), 3000);
            }
            setCart(syncedCart);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Menu abhi load nahi ho paaya. Dobara try karein.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMenu();
        const syncCart = () => setCart(readCart());
        window.addEventListener("cartUpdated", syncCart);
        window.addEventListener("storage", syncCart);
        return () => {
            window.removeEventListener("cartUpdated", syncCart);
            window.removeEventListener("storage", syncCart);
        };
    }, [loadMenu]);

    const visibleFoods = useMemo(() => {
        const query = search.trim().toLowerCase();
        return foods.filter((food) => {
            const categoryId = String(food.category?._id || food.category || "");
            const matchesCategory = selectedCategory === "all" || categoryId === selectedCategory;
            const haystack = `${food.name || ""} ${food.description || ""} ${food.category?.name || ""}`.toLowerCase();
            return matchesCategory && (!query || haystack.includes(query));
        });
    }, [foods, search, selectedCategory]);

    const cartCount = cart.reduce((count, item) => count + Number(item.quantity || 0), 0);

    const addToCart = (food) => {
        const foodId = getFoodId(food);
        if (!foodId) return;
        const existingCart = readCart();
        const match = existingCart.find((item) => getFoodId(item) === foodId);
        const updated = match
            ? existingCart.map((item) => getFoodId(item) === foodId ? { ...item, ...food, quantity: Number(item.quantity || 0) + 1 } : item)
            : [...existingCart, { ...food, quantity: 1 }];
        localStorage.setItem("cart", JSON.stringify(updated));
        setCart(updated);
        window.dispatchEvent(new Event("cartUpdated"));
        setToast(`${food.name} cart mein add ho gaya`);
        window.setTimeout(() => setToast(""), 2200);
    };

    const scrollCategories = (direction) => {
        document.getElementById("food-category-list")?.scrollBy({ left: direction * 440, behavior: "smooth" });
    };

    return (
        <main className="food-order-page ordering-home">
            <div className="food-topline">
                <span><MapPin size={14} aria-hidden="true" /> HOTEL MAURYA <i /> FRESHLY PREPARED, ALWAYS</span>
                <span><Clock3 size={14} aria-hidden="true" /> Order online for pickup or delivery</span>
            </div>

            <header className="food-header">
                <Link to="/" className="food-brand" aria-label="Hotel Maurya home">
                    <span className="food-brand-mark"><Utensils size={20} aria-hidden="true" /></span>
                    <span><strong>MAURYA</strong><small>KITCHEN & HOSPITALITY</small></span>
                </Link>
                <nav className="food-main-nav" aria-label="Main navigation">
                    <a className="active" href="#home">Home</a>
                    <a href="#menu">Menu</a>
                    <Link to="/rooms">Rooms</Link>
                    <Link to="/contact">Contact us</Link>
                </nav>
                <label className="food-search">
                    <Search size={18} aria-hidden="true" />
                    <input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedCategory("all"); }} placeholder="Search dishes, cuisines..." aria-label="Search dishes and cuisines" />
                    {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={16} /></button>}
                </label>
                <HomeProfileMenu isLoggedIn={isLoggedIn} user={currentUser} onLogout={onLogout} />
                <Link to="/cart" className="food-cart-link" aria-label={`Cart, ${cartCount} items`}>
                    <ShoppingBag size={19} aria-hidden="true" /><span>Cart</span><b>{cartCount}</b>
                </Link>
            </header>

            <section className="food-hero" id="home" aria-label="Hotel Maurya dining">
                <img className="food-hero-image" src="/images/hotel-maurya.jpg" alt="Hotel Maurya" fetchPriority="high" />
                <div className="food-hero-overlay" />
                <div className="food-hero-content">
                    <span className="food-eyebrow"><Sparkles size={14} aria-hidden="true" /> GOOD FOOD, GOOD MOOD</span>
                    <h1>Your next<br /><em>craving</em> starts here.</h1>
                    <p>Fresh picks from the Maurya kitchen, ready when you are.</p>
                    <div className="food-hero-actions">
                        <a className="food-primary-button" href="#menu">Explore menu <ArrowRight size={17} /></a>
                        <Link className="food-ghost-button" to="/rooms"><BedDouble size={17} /> Discover rooms</Link>
                    </div>
                </div>
                <div className="food-hero-note"><span className="food-note-icon"><Star size={17} fill="currentColor" /></span><span><b>Made fresh</b><small>From our kitchen to your table</small></span></div>
                <span className="food-hero-orbit food-hero-orbit-one" aria-hidden="true" />
                <span className="food-hero-orbit food-hero-orbit-two" aria-hidden="true" />
            </section>

            <div className="food-content-wrap">
                <section className="food-promise-strip">
                    <span className="promise-icon"><Utensils size={19} aria-hidden="true" /></span>
                    <span><b>What sounds good today?</b><small>Pick a favourite and we’ll take it from here.</small></span>
                    <a href="#menu">Browse dishes <ArrowRight size={15} /></a>
                </section>

                <section className="food-category-section" aria-labelledby="category-title">
                    <div className="food-section-heading">
                        <div><span className="food-section-kicker">FIND YOUR FLAVOUR</span><h2 id="category-title">Browse by category</h2></div>
                        <div className="food-carousel-controls">
                            <button type="button" aria-label="Scroll categories left" onClick={() => scrollCategories(-1)}><ChevronLeft size={19} /></button>
                            <button type="button" aria-label="Scroll categories right" onClick={() => scrollCategories(1)}><ChevronRight size={19} /></button>
                        </div>
                    </div>
                    <div className="food-category-list" id="food-category-list">
                        <button type="button" className={`food-category-chip ${selectedCategory === "all" ? "selected" : ""}`} onClick={() => setSelectedCategory("all")}>
                            <span className="category-all-art"><Utensils size={27} aria-hidden="true" /></span><b>Everything</b>
                        </button>
                        {categories.map((item) => (
                            <button type="button" key={item._id} className={`food-category-chip ${selectedCategory === item._id ? "selected" : ""}`} onClick={() => setSelectedCategory(item._id)}>
                                <span className="food-category-art">
                                    {item.image ? <img src={imageUrl(item.image)} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : <Utensils size={25} aria-hidden="true" />}
                                </span>
                                <b>{item.name}</b>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="food-menu-section" id="menu" aria-labelledby="menu-title">
                    <div className="food-section-heading menu-title-row">
                        <div><span className="food-section-kicker">MADE WITH CARE</span><h2 id="menu-title">{selectedCategory === "all" ? "The good stuff" : categories.find((item) => item._id === selectedCategory)?.name || "Menu"}</h2><p>Real dishes from our current menu.</p></div>
                        <span className="food-item-count">{loading ? "Loading…" : `${visibleFoods.length} ${visibleFoods.length === 1 ? "dish" : "dishes"}`}</span>
                    </div>

                    {error && <div className="food-error" role="alert"><span>{error}</span><button type="button" onClick={loadMenu}>Try again</button></div>}
                    {loading ? (
                        <div className="food-product-grid" aria-label="Loading menu" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div className="food-product-skeleton" key={index}><span /><i /><i /></div>)}</div>
                    ) : visibleFoods.length ? (
                        <div className="food-product-grid">
                            {visibleFoods.map((food, index) => {
                                const originalPrice = Number(food.price || 0);
                                const discountPrice = Number(food.discountPrice);
                                const price = Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < originalPrice
                                    ? discountPrice
                                    : originalPrice;
                                return (
                                    <article className="food-product-card" key={food._id} style={{ "--card-order": index }}>
                                        <div className="food-product-image">
                                            {food.image ? <img src={imageUrl(food.image)} alt={food.name} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="food-image-fallback"><Utensils size={32} aria-hidden="true" /></span>}
                                            {food.isFeatured && <span className="food-feature-tag"><Sparkles size={12} /> Kitchen pick</span>}
                                            <span className={`food-type-indicator ${food.foodType === "non-veg" ? "non-veg" : "veg"}`} title={food.foodType || "veg"}><i /></span>
                                        </div>
                                        <div className="food-product-info">
                                            <span className="food-product-category">{food.category?.name || "Maurya Kitchen"}</span>
                                            <h3>{food.name}</h3>
                                            {food.description && <p>{food.description}</p>}
                                            <div className="food-product-bottom">
                                                <span className="food-price">{formatMoney(price)}{price !== originalPrice && <del>{formatMoney(originalPrice)}</del>}</span>
                                                <button type="button" onClick={() => addToCart(food)} aria-label={`Add ${food.name} to cart`}><Plus size={16} /> Add</button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="food-empty-results"><Search size={24} aria-hidden="true" /><b>No dishes found</b><span>Try another search or select a different category.</span><button type="button" onClick={() => { setSearch(""); setSelectedCategory("all"); }}>Clear filters</button></div>
                    )}
                </section>

                <section className="food-room-promo" id="experience">
                    <span className="promo-spark" aria-hidden="true"><Sparkles size={22} /></span>
                    <span className="food-section-kicker">STAY A LITTLE LONGER</span>
                    <h2>Make a Maurya moment<br />out of your next getaway.</h2>
                    <Link to="/rooms" className="food-primary-button">Explore rooms <ArrowRight size={16} /></Link>
                </section>
            </div>

            <footer className="food-footer"><Link to="/">MAURYA</Link><span>Stay · Dine · Unwind</span><Link to="/menu">Full menu <ArrowRight size={14} /></Link></footer>
            {toast && <div className="food-toast" role="status"><Check size={17} /> {toast}</div>}
        </main>
    );
}
