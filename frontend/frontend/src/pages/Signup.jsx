
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Signup.css";

function Signup() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]:
                name === "phone"
                    ? value.replace(/\D/g, "").slice(0, 10)
                    : value,
        }));

        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const name = formData.name.trim();
        const email = formData.email.trim().toLowerCase();
        const phone = formData.phone.trim();

        if (!name || !email || !phone || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError(
                "Enter a valid 10-digit Indian mobile number."
            );
            return;
        }

        if (formData.password.length < 6) {
            setError(
                "Password must contain at least 6 characters."
            );
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                "http://localhost:5000/api/customer-auth/register",
                {
                    name,
                    email,
                    phone,
                    password: formData.password,
                }
            );

            if (
                response.status === 200 ||
                response.status === 201
            ) {
                navigate("/login", {
                    replace: true,
                    state: {
                        message:
                            "Account created successfully. Please log in.",
                    },
                });
            }
        } catch (err) {
            const status = err.response?.status;
            const backendMessage =
                err.response?.data?.message ||
                err.response?.data?.error;

            if (status === 409) {
                setError(
                    backendMessage ||
                    "This email or mobile number is already registered."
                );
            } else {
                setError(
                    backendMessage ||
                    "Unable to create account. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-page">
            <div className="signup-card">
                <Link to="/" className="signup-brand">
                    Hotel &amp; Restaurant
                </Link>

                <h1>Create your account</h1>

                <p className="signup-subtitle">
                    Sign up to book rooms and order your favourite food.
                </p>

                {error && (
                    <div className="signup-error" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label htmlFor="name">Full name *</label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        autoComplete="name"
                        minLength={2}
                        maxLength={100}
                        required
                    />

                    <label htmlFor="phone">Mobile number *</label>
                    <input
                        id="phone"
                        type="tel"
                        name="phone"
                        placeholder="Enter 10-digit mobile number"
                        value={formData.phone}
                        onChange={handleChange}
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        minLength={10}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        title="Enter a valid 10-digit Indian mobile number"
                        required
                    />

                    <label htmlFor="email">Email address *</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        maxLength={254}
                        required
                    />

                    <label htmlFor="password">Password *</label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="At least 6 characters"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        minLength={6}
                        required
                    />

                    <label htmlFor="confirmPassword">
                        Confirm password *
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        placeholder="Enter password again"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        minLength={6}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading
                            ? "Creating account..."
                            : "Create Account"}
                    </button>
                </form>

                <p className="signup-login-link">
                    Already have an account?{" "}
                    <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
