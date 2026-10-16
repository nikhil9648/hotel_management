
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Signup.css";

function Signup() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must contain at least 6 characters.");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                "http://localhost:5000/api/customer-auth/register",
                {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                    // role: "customer",
                }
            );

            if (response.status === 200 || response.status === 201) {
                navigate("/login", {
                    replace: true,
                    state: {
                        message: "Account created successfully. Please log in.",
                    },
                });
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Unable to create account. Please try again."
            );
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
                    <label htmlFor="name">Full name</label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        autoComplete="name"
                        required
                    />

                    <label htmlFor="email">Email address</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="password">Password</label>
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
                        Confirm password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        placeholder="Enter password again"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
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
