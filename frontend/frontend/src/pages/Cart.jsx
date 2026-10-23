import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, ShoppingBag, Trash2, Utensils } from "lucide-react";
import "../styles/FoodOrdering.css";

const API = "http://localhost:5000/api";
const ASSET_BASE = "http://localhost:5000";
const TAX_RATE = 0.18;

const readCart = () => {
    try {
        const value = JSON.parse(localStorage.getItem("cart") || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
};

const getFoodId = (item) => String(item?._id || item?.foodItem?._id || item?.foodItem || item?.food?._id || item?.food || item?.foodId || item?.id || "");
const getPrice = (item) => {
    const discount = Number(item?.discountPrice);
    const regular = Number(item?.price ?? item?.food?.price ?? item?.foodItem?.price ?? 0);
    return Number.isFinite(discount) && discount > 0 && discount < regular ? discount : regular;
};
const imageUrl = (image) => !image ? "" : /^(https?:)?\/\//i.test(image) ? image : `${ASSET_BASE}${image.startsWith("/") ? "" : "/"}${image}`;
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));

export default function Cart() {
    const [cart, setCart] = useState(readCart);
    const [syncing, setSyncing] = useState(false);
    const [cartNotice, setCartNotice] = useState("");

    useEffect(() => {
        let active = true;
        const stored = readCart();
        if (!stored.length) return () => { active = false; };

        setSyncing(true);
        axios.get(`${API}/menu/foods`).then((response) => {
            if (!active) return;
            const foods = response.data?.foodItems || [];
            const byId = new Map(foods.map((food) => [String(food._id), food]));
            const hydrated = stored.flatMap((item) => {
                const currentFood = byId.get(getFoodId(item));
                return currentFood ? [{ ...item, ...currentFood, quantity: Number(item.quantity || 1) }] : [];
            });
            if (hydrated.length !== stored.length) {
                setCartNotice("Menu items that are no longer in the backend menu were removed from your basket.");
            }
            setCart(hydrated);
            localStorage.setItem("cart", JSON.stringify(hydrated));
        }).catch(() => {
            // Existing cart data remains usable when the menu service is offline.
        }).finally(() => {
            if (active) setSyncing(false);
        });
        return () => { active = false; };
    }, []);

    const updateCart = (next) => {
        setCart(next);
        localStorage.setItem("cart", JSON.stringify(next));
        window.dispatchEvent(new Event("cartUpdated"));
    };

    const updateQuantity = (foodId, delta) => {
        updateCart(cart.map((item) => getFoodId(item) === foodId
            ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) }
            : item));
    };

    const removeItem = (foodId) => updateCart(cart.filter((item) => getFoodId(item) !== foodId));

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + getPrice(item) * Number(item.quantity || 0), 0), [cart]);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = subtotal + tax;
    const itemCount = cart.reduce((count, item) => count + Number(item.quantity || 0), 0);

    const hasUnavailableItems = cart.some((item) => item.isAvailable === false);

    if (!cart.length) {
        return (
            <main className="order-page cart-page">
                <div className="order-page-top"><Link to="/" className="order-back-link"><ArrowLeft size={17} /> Back to home</Link><span className="order-step-label">YOUR BASKET</span></div>
                <section className="empty-basket-card">
                    <span className="empty-basket-icon"><ShoppingBag size={36} /></span>
                    <span className="order-eyebrow">ROOM FOR SOMETHING DELICIOUS</span>
                    <h1>Your basket is waiting.</h1>
                    <p>Browse the Maurya menu and add a little joy to your day.</p>
                    {cartNotice && <p className="cart-sync-notice" role="status">{cartNotice}</p>}
                    <Link to="/" className="order-primary-button">Explore the menu <ArrowRight size={17} /></Link>
                </section>
            </main>
        );
    }

    return (
        <main className="order-page cart-page">
            <div className="order-page-top">
                <Link to="/" className="order-back-link"><ArrowLeft size={17} /> Continue browsing</Link>
                <span className="order-step-label">01 <i /> YOUR BASKET</span>
            </div>
            <header className="order-page-heading"><div><span className="order-eyebrow">A GOOD CHOICE</span><h1>Your basket<span>.</span></h1><p>{itemCount} {itemCount === 1 ? "item" : "items"}{syncing ? " · refreshing menu details" : " · fresh from our menu"}</p></div><span className="basket-heading-mark"><ShoppingBag size={23} /></span></header>
            {cartNotice && <p className="cart-sync-notice" role="status">{cartNotice}</p>}

            <div className="cart-layout">
                <section className="cart-lines" aria-label="Items in your basket">
                    {cart.map((item, index) => {
                        const id = getFoodId(item);
                        const price = getPrice(item);
                        const originalPrice = Number(item.price ?? item.food?.price ?? item.foodItem?.price ?? 0);
                        const name = item.name || item.food?.name || item.foodItem?.name || "Menu item";
                        const category = item.category?.name || item.categoryName;
                        return (
                            <article className="cart-line-card" key={id || index} style={{ "--card-order": index }}>
                                <div className="cart-line-image">
                                    {item.image ? <img src={imageUrl(item.image)} alt={name} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : <span><Utensils size={28} /></span>}
                                </div>
                                <div className="cart-line-details">
                                    {category && <span className="cart-line-category">{category}</span>}
                                    <h2>{name}</h2>
                                    {item.isAvailable === false && <span className="cart-unavailable">Currently unavailable</span>}
                                    <div className="cart-line-price">{money(price)}{price !== originalPrice && <del>{money(originalPrice)}</del>}</div>
                                    <div className="cart-quantity-control" aria-label={`Quantity for ${name}`}>
                                        <button type="button" onClick={() => updateQuantity(id, -1)} aria-label={`Decrease ${name} quantity`}><Minus size={15} /></button>
                                        <span aria-live="polite">{item.quantity}</span>
                                        <button type="button" onClick={() => updateQuantity(id, 1)} aria-label={`Increase ${name} quantity`}><Plus size={15} /></button>
                                    </div>
                                </div>
                                <div className="cart-line-total"><b>{money(price * Number(item.quantity || 0))}</b><button type="button" onClick={() => removeItem(id)} aria-label={`Remove ${name} from basket`}><Trash2 size={16} /><span>Remove</span></button></div>
                            </article>
                        );
                    })}
                    <Link to="/" className="cart-add-more"><Plus size={16} /> Add more from the menu</Link>
                </section>

                <aside className="basket-summary">
                    <span className="order-eyebrow">ORDER SUMMARY</span>
                    <h2>The delicious details</h2>
                    <div className="summary-row"><span>Subtotal · {itemCount} items</span><b>{money(subtotal)}</b></div>
                    <div className="summary-row"><span>Tax (18%)</span><b>{money(tax)}</b></div>
                    <div className="summary-total"><span>Total</span><b>{money(total)}</b></div>
                    <p className="summary-note"><Check size={15} /> Final prices are confirmed by the kitchen at checkout.</p>
                    {hasUnavailableItems ? <p className="checkout-unavailable-note">Remove unavailable item(s) before checkout.</p> : <Link to="/checkout" className="order-primary-button checkout-link">Continue to checkout <ArrowRight size={17} /></Link>}
                    <div className="basket-secure-note"><span /> Freshly prepared · Secure checkout</div>
                </aside>
            </div>
        </main>
    );
}
