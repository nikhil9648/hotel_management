import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HomeProfileMenu from "../components/HomeProfileMenu";
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
{
name: "North Indian",
image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=240&auto=format&fit=crop&q=80",
},
{
name: "Burger",
image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=240&auto=format&fit=crop&q=80",
filter: null,
},
{
name: "Pizza",
image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=240&auto=format&fit=crop&q=80",
filter: "Pizza & Snacks",
},
{
name: "Desserts",
image: "https://images.unsplash.com/photo-1551024506-0bcf5f8a9b8d?w=240&auto=format&fit=crop&q=80",
filter: "Desserts",
},
{
name: "Biryani",
image: "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=240&auto=format&fit=crop&q=80",
filter: null,
},
{
name: "Cake",
image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=240&auto=format&fit=crop&q=80",
filter: "Desserts",
},
{
name: "Rolls",
image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=240&auto=format&fit=crop&q=80",
filter: null,
},
{
name: "Noodles",
image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=240&auto=format&fit=crop&q=80",
filter: "Chinese",
},
{
name: "Pasta",
image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=240&auto=format&fit=crop&q=80",
filter: null,
},
{
name: "Dosa",
image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=240&auto=format&fit=crop&q=80",
filter: "South Indian",
},
{
name: "Paratha",
image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=240&auto=format&fit=crop&q=80",
filter: "North Indian",
},
{
name: "Salad",
image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=240&auto=format&fit=crop&q=80",
filter: null,
},
{
name: "Coffee",
image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=240&auto=format&fit=crop&q=80",
filter: "Beverages",
},
{
name: "Pastry",
image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=240&auto=format&fit=crop&q=80",
filter: "Desserts",
},
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

export default function Home({
    isLoggedIn = Boolean(localStorage.getItem("token")),
    currentUser = null,
    onLogout,
})  {
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

                <div className="maurya-login">
    <HomeProfileMenu
        isLoggedIn={isLoggedIn}
        user={
            currentUser ||
            (() => {
                try {
                    return JSON.parse(
                        localStorage.getItem("user") || "null"
                    );
                } catch {
                    return null;
                }
            })()
        }
        onLogout={onLogout}
    />
</div>
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
                            {/* SWIGGY-STYLE FOOD CATEGORIES */}
            <section className="category-section" id="categories">
                <div className="swiggy-category-heading">
                    <h2>Order our best food options</h2>

                    <div className="category-arrows">
                        <button
                            type="button"
                            aria-label="Scroll categories left"
                            onClick={() =>
                                document
                                    .getElementById("category-grid")
                                    ?.scrollBy({
                                        left: -500,
                                        behavior: "smooth",
                                    })
                            }
                        >
                            ‹
                        </button>

                        <button
                            type="button"
                            aria-label="Scroll categories right"
                            onClick={() =>
                                document
                                    .getElementById("category-grid")
                                    ?.scrollBy({
                                        left: 500,
                                        behavior: "smooth",
                                    })
                            }
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className="swiggy-category-grid" id="category-grid">
                    {categories.map((item) => (
                        <button
                            type="button"
                            className={`swiggy-category-item ${
                                category === (item.filter || item.name)
                                    ? "selected"
                                    : ""
                            }`}
                            key={item.name}
                            onClick={() => {
                                if (item.filter) {
                                    setCategory(item.filter);
                                    document
                                        .getElementById("menu")
                                        ?.scrollIntoView({
                                            behavior: "smooth",
                                        });
                                } else {
                                    setSearch(item.name);
                                    document
                                        .getElementById("menu")
                                        ?.scrollIntoView({
                                            behavior: "smooth",
                                        });
                                }
                            }}
                        >
                            <div className="swiggy-category-image">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    loading="lazy"
                                />
                            </div>

                            <span>{item.name}</span>
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
                    {!isLoggedIn && <Link to="/login">Sign in</Link>}
                </div>

                <small>
                    © {new Date().getFullYear()} Hotel Maurya
                </small>
            </footer>
        </main>
    );
}