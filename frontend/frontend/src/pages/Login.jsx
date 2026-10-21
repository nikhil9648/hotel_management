
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/authService";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Normalize role names from the backend
  const normalizeRole = (role) =>
    String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  // Select dashboard according to role
  const getDashboardPath = (role) => {
    const paths = {
      admin: "/admin",
      manager: "/admin",
      receptionist: "/admin/billing",
      waiter: "/waiter",
      kitchen: "/kitchen",
      accountant: "/admin",
      hr: "/admin",
      delivery_boy: "/delivery/delivery-dashboard",
      customer: "/rooms",
      user: "/rooms",
    };

    return paths[normalizeRole(role)] || "/rooms";
  };

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

      console.log("Login response:", response);

      // Support common response structures
      const payload = response?.data || response;
      const user = payload?.user || payload?.data?.user;
      const token =
        payload?.token ||
        payload?.accessToken ||
        payload?.data?.token;

      if (!user || !token) {
        setError(
          payload?.message ||
            "Login response mein user ya token nahi mila."
        );
        return;
      }

      const role = normalizeRole(user.role);

      console.log("Logged-in user:", user);
      console.log("Normalized role:", role);

      // Save login information
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Update global login state
      if (onLogin) {
        onLogin(user);
      }

      // Redirect according to role
      const dashboardPath = getDashboardPath(role);

      console.log("Redirecting to:", dashboardPath);

      navigate(dashboardPath, { replace: true });
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to login. Please check your credentials and server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          Hotel &amp; Restaurant
        </h1>

        <p className="mb-8 text-center text-gray-500">
          Login to Your Account
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block font-medium text-gray-700"
            >
              Email
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-100 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
