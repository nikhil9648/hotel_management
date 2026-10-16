
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { Link } from "react-router-dom";

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    // Normalize role and select the correct dashboard
    const getDashboardPath = (role) => {
        const normalizedRole = String(role || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

        const dashboardPaths = {
            admin: "/admin",
            manager: "/admin",
            receptionist: "/admin/billing",
            waiter: "/waiter",
            kitchen: "/kitchen",
            customer: "/rooms",
            user: "/rooms",
        };

        return dashboardPaths[normalizedRole] || "/rooms";
    };

    // Login handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Email and password are required.");
            return;
        }

        setLoading(true);

        try {
            const response = await loginUser(
                email.trim(),
                password
            );

            console.log("Login Response:", response);

            if (
                !response?.success ||
                !response?.token ||
                !response?.user
            ) {
                setError(
                    response?.message || "Login failed."
                );
                return;
            }

            const user = response.user;

            console.log("Logged-in user:", user);
            console.log("Logged-in role:", user.role);

            // Save authentication information
            localStorage.setItem("token", response.token);
            localStorage.setItem(
                "user",
                JSON.stringify(user)
            );

            // Update App login state
            if (onLogin) {
                onLogin(user);
            }

            // Navigate to the correct dashboard
            const dashboardPath = getDashboardPath(user.role);

            console.log("Redirecting to:", dashboardPath);

            navigate(dashboardPath, {
                replace: true,
            });
        } catch (error) {
            console.error("Login Error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to login. Please check the server."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-2">
                    Hotel & Restaurant
                </h1>

                <p className="text-center text-gray-500 mb-8">
                    Login to Your Account
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >
                    {/* EMAIL */}
                    <div>
                        <label
                            htmlFor="login-email"
                            className="block mb-2 font-medium"
                        >
                            Email
                        </label>

                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* PASSWORD */}
                    <div>
                        <label
                            htmlFor="login-password"
                            className="block mb-2 font-medium"
                        >
                            Password
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                            className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div
                            role="alert"
                            className="bg-red-100 text-red-700 p-3 rounded-lg text-sm"
                        >
                            {error}
                        </div>
                    )}

                    {/* LOGIN BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"}
                    </button>
                    <p className="signup-login-link">
    Don't have an account?{" "}
    <Link to="/signup">Sign Up</Link>
</p>
                </form>
            </div>
        </div>
    );
};

export default Login;
