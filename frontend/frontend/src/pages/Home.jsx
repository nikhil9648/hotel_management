import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    ShoppingCart,
    MapPin,
    Clock3,
    ArrowRight,
    Star,
    Plus,
    Utensils,
    BedDouble,
    Sparkles,
    ChevronRight,
} from "lucide-react";

import "../styles/Home.css";

const categories = [
    { name: "All", icon: "✦" },
    { name: "North Indian", icon: "🍛" },
    { name: "South Indian", icon: "🥞" },
    { name: "Chinese", icon: "🍜" },
    { name: "Pizza & Snacks", icon: "🍕" },
    { name: "Thalis", icon: "🍱" },
    { name: "Desserts", icon: "🍰" },
    { name: "Beverages", icon: "🥤" },
];

const dishes = [
    {
        id: "paneer",
        name: "Paneer Butter Masala",
        category: "North Indian",
        description: "Creamy tomato gravy with soft paneer",
        price: 249,
        rating: 4.7,
        emoji: "🍛",
        tag: "Bestseller",
    },
    {
        id: "noodles",
        name: "Veg Hakka Noodles",
        category: "Chinese",
        description: "Wok-tossed with fresh vegetables",
        price: 189,
        rating: 4.5,
        emoji: "🍜",
        tag: "Popular",
    },
    {
        id: "thali",
        name: "Deluxe Veg Thali",
        category: "Thalis",
        description: "A complete meal made with care",
        price: 299,
        rating: 4.8,
        emoji: "🍱",
        tag: "Chef's pick",
    },
    {
        id: "dosa",
        name: "Masala Dosa",
        category: "South Indian",
        description: "Crispy dosa with chutneys and sambar",
        price: 159,
        rating: 4.6,
        emoji: "🥞",
        tag: "Classic",
    },
    {
        id: "pizza",
        name: "Margherita Pizza",
        category: "Pizza & Snacks",
        description: "Cheese, tomato and fresh herbs",
        price: 219,
        rating: 4.4,
        emoji: "🍕",
        tag: "Favourite",
    },
    {
        id: "gulab-jamun",
        name: "Gulab Jamun",
        category: "Desserts",
        description: "Soft and delicately sweet",
        price: 99,
        rating: 4.6,
        emoji: "🍮",
        tag: "Sweet treat",
    },
    {
        id: "lime",
        name: "Fresh Lime Soda",
        category: "Beverages",
        description: "Fresh and refreshing",
        price: 79,
        rating: 4.3,
        emoji: "🍋",
        tag: "Refreshing",
    },
    {
        id: "chole",
        name: "Chole Bhature",
        category: "North Indian",
        description: "Punjabi chole with fluffy bhature",
        price: 179,
        rating: 4.5,
        emoji: "🫓",
        tag: "Bestseller",
    },
];

export default function Home() {
    const [category, setCategory] = useState("All");
    const [search, setSearch] = useState("");

    const [cart, setCart] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("cart") || "[]");
        } catch {
            return [];
        }
    });

    const filteredDishes = useMemo(() => {
        return dishes.filter((dish) => {
            const matchesCategory =
                category === "All" || dish.category === category;

            const query = search.trim().toLowerCase();

            const matchesSearch =
                !query ||
                `${dish.name} ${dish.category} ${dish.description}`
                    .toLowerCase()
                    .includes(query);

            return matchesCategory && matchesSearch;
        });
    }, [category, search]);

    const addToCart = (dish) => {
        const updatedCart = [...cart];

        const existingItem = updatedCart.find(
            (item) =>
                item.id === dish.id ||
                item.foodId === dish.id
        );

        if (existingItem) {
            existingItem.quantity =
                Number(existingItem.quantity || 1) + 1;
        } else {
            updatedCart.push({
                id: dish.id,
                foodId: dish.id,
                name: dish.name,
                price: dish.price,
                quantity: 1,
            });
        }

        setCart(updatedCart);
        localStorage.setItem(
            "cart",
            JSON.stringify(updatedCart)
        );
    };

    const cartCount = cart.reduce(
        (total, item) =>
            total + Number(item.quantity || 1),
        0
    );

    return (
        <main className="maurya">
            {/* TOP STRIP */}
            <div className="maurya-topline">
                <span>
                    <MapPin size={14} />
                    Welcome to Hotel Maurya
                </span>

                <span>
                    <Clock3 size={14} />
                    Fresh food · Warm hospitality
                </span>
            </div>

            {/* HEADER */}
            <header className="maurya-header">
                <Link to="/" className="maurya-brand">
                    <span className="brand-emblem">✺</span>

                    <span>
                        <strong>HOTEL MAURYA</strong>
                        <small>STAY · DINE · UNWIND</small>
                    </span>
                </Link>

                <nav className="maurya-nav">
                    <a href="#home" className="is-active">
                        Home
                    </a>

                    <a href="#menu">Order Food</a>

                    <a href="#experience">
                        Our Experience
                    </a>

                    <Link to="/rooms">Rooms</Link>
                </nav>

                <label className="maurya-search">
                    <Search size={18} />

                    <input
                        type="search"
                        placeholder="Search dishes or cuisines"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);

                            if (event.target.value) {
                                document
                                    .getElementById("menu")
                                    ?.scrollIntoView({
                                        behavior: "smooth",
                                    });
                            }
                        }}
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}
                </label>

                <Link
                    to="/cart"
                    className="maurya-cart"
                    aria-label={`Cart, ${cartCount} items`}
                >
                    <ShoppingCart size={21} />
                    <span>{cartCount}</span>
                </Link>

                <Link to="/login" className="maurya-login">
                    Sign in
                </Link>
            </header>

            {/* HERO */}
            <section className="maurya-hero" id="home">
                <img
                    src="/images/hotel-maurya.jpg"
                    alt="Hotel Maurya exterior"
                />

                <div className="hero-overlay" />

                <div className="hero-inner">
                    <div className="hero-copy">
                        <div className="hero-kicker">
                            <Sparkles size={15} />
                            A LITTLE LUXURY, EVERY DAY
                        </div>

                        <h1>
                            Good food.
                            <br />
                            <em>Great stays.</em>
                        </h1>

                        <p>
                            Discover your next favourite meal,
                            unwind in comfort, and enjoy
                            hospitality that feels personal.
                        </p>

                        <div className="hero-buttons">
                            <a
                                href="#menu"
                                className="btn btn-orange"
                            >
                                <Utensils size={17} />
                                Explore the menu
                                <ArrowRight size={16} />
                            </a>

                            <Link
                                to="/rooms"
                                className="btn btn-glass"
                            >
                                <BedDouble size={18} />
                                Discover rooms
                            </Link>
                        </div>

                        <div className="hero-trust">
                            <span>
                                <Star size={14} fill="currentColor" />
                                Fresh ingredients
                            </span>

                            <i />

                            <span>Made with care</span>

                            <i />

                            <span>Warm hospitality</span>
                        </div>
                    </div>

                    <div className="hero-floating-card">
                        <span className="floating-icon">✦</span>

                        <div>
                            <strong>Your table is waiting</strong>
                            <small>Comfort food, elevated.</small>
                        </div>

                        <ChevronRight size={18} />
                    </div>
                </div>
            </section>

            {/* CONTENT */}
            <div className="maurya-body">
                <div className="delivery-strip">
                    <div className="delivery-icon">
                        <Utensils size={20} />
                    </div>

                    <div>
                        <strong>Craving something delicious?</strong>
                        <small>
                            Find your favourite flavour at Hotel Maurya.
                        </small>
                    </div>

                    <a href="#menu">
                        Browse menu <ArrowRight size={15} />
                    </a>
                </div>

                {/* CATEGORIES */}
                <section className="category-section">
                    <div className="section-heading">
                        <div>
                            <span className="section-kicker">
                                EXPLORE THE MENU
                            </span>

                            <h2>What are you craving?</h2>

                            <p>
                                Something delicious for every mood.
                            </p>
                        </div>

                        <span className="heading-flower">✺</span>
                    </div>

                    <div className="category-row">
                        {categories.map((item) => (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() =>
                                    setCategory(item.name)
                                }
                                className={`category-pill ${
                                    category === item.name
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <span>{item.icon}</span>

                                <strong>
                                    {item.name === "All"
                                        ? "All dishes"
                                        : item.name}
                                </strong>
                            </button>
                        ))}
                    </div>
                </section>

                {/* FOOD MENU */}
                <section className="menu-section" id="menu">
                    <div className="section-heading menu-heading">
                        <div>
                            <span className="section-kicker">
                                FAVOURITES FROM OUR KITCHEN
                            </span>

                            <h2>
                                {category === "All"
                                    ? "Popular at Maurya"
                                    : category}
                            </h2>

                            <p>
                                Made fresh. Served with extra care.
                            </p>
                        </div>

                        <span className="menu-count">
                            {filteredDishes.length} items
                        </span>
                    </div>

                    {filteredDishes.length > 0 ? (
                        <div className="food-grid">
                            {filteredDishes.map((dish) => (
                                <article
                                    className="food-card"
                                    key={dish.id}
                                >
                                    <div className="food-art">
                                        <span className="food-tag">
                                            {dish.tag}
                                        </span>

                                        <span className="veg-dot">
                                            <i />
                                        </span>

                                        <span className="food-emoji">
                                            {dish.emoji}
                                        </span>
                                    </div>

                                    <div className="food-info">
                                        <div className="food-title-line">
                                            <h3>{dish.name}</h3>

                                            <span className="food-rating">
                                                <Star
                                                    size={12}
                                                    fill="currentColor"
                                                />
                                                {dish.rating}
                                            </span>
                                        </div>

                                        <p>{dish.description}</p>

                                        <div className="food-bottom">
                                            <strong>
                                                ₹{dish.price}
                                            </strong>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addToCart(dish)
                                                }
                                            >
                                                <Plus size={16} />
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="no-results">
                            <Search size={27} />

                            <strong>No dishes found</strong>

                            <span>
                                Try another search or category.
                            </span>

                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setCategory("All");
                                }}
                            >
                                Clear filters
                            </button>
                        </div>
                    )}

                    <p className="demo-warning">
                        Sample menu data — connect your food API
                        for actual items and prices.
                    </p>
                </section>

                {/* PROMOTIONS */}
                <section
                    className="promo-grid"
                    id="experience"
                >
                    <article className="promo-card food-promo">
                        <div className="promo-icon">♨</div>

                        <span className="section-kicker">
                            A MAURYA MOMENT
                        </span>

                        <h2>
                            Comfort food.
                            <br />
                            Made memorable.
                        </h2>

                        <p>
                            Find a new favourite or return to an old one.
                        </p>

                        <a
                            href="#menu"
                            className="btn btn-orange"
                        >
                            Order food <ArrowRight size={15} />
                        </a>
                    </article>

                    <article className="promo-card room-promo">
                        <div className="room-promo-content">
                            <span className="section-kicker">
                                STAY A LITTLE LONGER
                            </span>

                            <h2>
                                Your own space
                                <br />
                                to unwind.
                            </h2>

                            <p>
                                Thoughtful comforts and a warm welcome.
                            </p>

                            <Link
                                to="/rooms"
                                className="btn btn-dark"
                            >
                                <BedDouble size={16} />
                                Explore rooms
                                <ArrowRight size={15} />
                            </Link>
                        </div>
                    </article>
                </section>

                <section className="maurya-values">
                    <span className="values-symbol">✺</span>

                    <div>
                        <span className="section-kicker">
                            THE MAURYA EXPERIENCE
                        </span>

                        <h2>
                            Hospitality is how we make you feel.
                        </h2>

                        <p>
                            Come for the food. Stay for the comfort.
                            Leave with a reason to return.
                        </p>
                    </div>

                    <Link to="/rooms">
                        Discover Hotel Maurya
                        <ArrowRight size={16} />
                    </Link>
                </section>
            </div>

            {/* FOOTER */}
            <footer className="maurya-footer">
                <Link to="/" className="footer-brand">
                    ✺ HOTEL MAURYA
                </Link>

                <span>Stay · Dine · Unwind</span>

                <div>
                    <a href="#menu">Menu</a>
                    <Link to="/rooms">Rooms</Link>
                    <Link to="/login">Sign in</Link>
                </div>

                <small>
                    © {new Date().getFullYear()} Hotel Maurya
                </small>
            </footer>
        </main>
    );
}