
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  RefreshCw,
  ReceiptText,
  Banknote,
  CreditCard,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

const API = "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load dashboard data.";

function getTodayRange() {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getPaymentMethod(bill) {
  return String(
    bill.paymentMethod ||
      bill.payment?.method ||
      bill.method ||
      ""
  ).toLowerCase();
}

function getAmount(bill) {
  return Number(
    bill.totalAmount ??
      bill.grandTotal ??
      bill.amount ??
      bill.total ??
      0
  );
}

function getPaid(bill) {
  const status = String(
    bill.paymentStatus || bill.status || ""
  ).toLowerCase();

  return (
    ["paid", "completed", "success", "successful"].includes(status) ||
    bill.paymentReceived === true
  );
}

function getCreatorId(bill) {
  const creator =
    bill.createdBy ||
    bill.generatedBy ||
    bill.cashier ||
    bill.receptionist ||
    bill.user;

  if (!creator) return "";

  if (typeof creator === "string") return creator;

  return String(creator._id || creator.id || "");
}

function getCreatedAt(bill) {
  return new Date(
    bill.createdAt ||
      bill.paidAt ||
      bill.paymentDate ||
      bill.date ||
      0
  );
}

function getBillsFromResponse(data) {
  if (Array.isArray(data)) return data;

  const possibleLists = [
    data?.bills,
    data?.bookings,
    data?.transactions,
    data?.payments,
    data?.orders,
    data?.history,
    data?.data?.bills,
    data?.data?.transactions,
    data?.data?.orders,
  ];

  return possibleLists.find(Array.isArray) || [];
}

function StatCard({ title, value, icon: Icon, description }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-gray-500">{description}</p>
        </div>

        <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function ReceptionDashboard() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please log in again.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      /*
       * This uses the existing reception billing history endpoint.
       * If your backend uses another endpoint, change this URL to
       * the GET endpoint already used by ReceptionBilling.jsx.
       */
      const response = await axios.get(
        `${API}/restaurant-bills`,
        { headers }
      );

      const list = getBillsFromResponse(response.data);

      setBills(list);
      setLastUpdated(new Date());
    } catch (err) {
      setBills([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const currentUserId = String(user?._id || user?.id || "");
  const { start, end } = getTodayRange();

  /*
   * IMPORTANT:
   * Only count records whose creator ID is explicitly available
   * and matches the logged-in receptionist. Do not count records
   * with missing creator information as the receptionist's own.
   */
  const myBills = bills.filter((bill) => {
    const creatorId = getCreatorId(bill);

    return currentUserId && creatorId === currentUserId;
  });

  const todayMyBills = myBills.filter((bill) => {
    const createdAt = getCreatedAt(bill);

    return (
      !Number.isNaN(createdAt.getTime()) &&
      createdAt >= start &&
      createdAt <= end
    );
  });

  const paidToday = todayMyBills.filter(getPaid);

  const cashCollection = paidToday
    .filter((bill) => {
      const method = getPaymentMethod(bill);
      return method === "cash";
    })
    .reduce((total, bill) => total + getAmount(bill), 0);

  const onlineCollection = paidToday
    .filter((bill) => {
      const method = getPaymentMethod(bill);

      return ["upi", "online", "razorpay", "card", "netbanking"].includes(
        method
      );
    })
    .reduce((total, bill) => total + getAmount(bill), 0);

  const totalCollection = cashCollection + onlineCollection;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reception Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your bills and today's recorded collections.
          </p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString("en-IN")}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={20} className="shrink-0" />
          <div>
            <p className="font-semibold">Dashboard data could not be loaded</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2">
              Check the GET endpoint used by your ReceptionBilling page.
            </p>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Today's Collections
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total Collection"
            value={loading ? "Loading..." : money(totalCollection)}
            icon={Banknote}
            description="Your paid cash and online bills today"
          />

          <StatCard
            title="Cash Collection"
            value={loading ? "Loading..." : money(cashCollection)}
            icon={ReceiptText}
            description="Cash payments recorded today"
          />

          <StatCard
            title="Online Collection"
            value={loading ? "Loading..." : money(onlineCollection)}
            icon={CreditCard}
            description="UPI, Razorpay, card and online payments"
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">My Bills</h2>
            <p className="mt-1 text-sm text-gray-500">
              Bills associated with your logged-in account.
            </p>
          </div>

          <div className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">
            {loading ? "Loading..." : `${myBills.length} bills`}
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-gray-500">
            Loading your bills...
          </p>
        ) : myBills.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays className="mx-auto mb-3 text-gray-400" size={30} />
            <p className="font-semibold text-gray-800">No matching bills found</p>
            <p className="mt-1 text-sm text-gray-500">
              Bills will appear here when the API returns your creator ID
              with each bill.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Bill / Booking</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {myBills.map((bill, index) => {
                  const createdAt = getCreatedAt(bill);

                  return (
                    <tr key={bill._id || bill.id || index}>
                      <td className="p-3 font-medium">
                        {bill.billNumber ||
                          bill.bookingNumber ||
                          bill.orderNumber ||
                          bill._id ||
                          "—"}
                      </td>

                      <td className="p-3">
                        {Number.isNaN(createdAt.getTime()) ||
                        !bill.createdAt && !bill.paidAt && !bill.paymentDate && !bill.date
                          ? "—"
                          : createdAt.toLocaleString("en-IN")}
                      </td>

                      <td className="p-3">
                        {bill.paymentMethod || bill.method || "—"}
                      </td>

                      <td className="p-3">
                        {bill.paymentStatus || bill.status || "—"}
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {money(getAmount(bill))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
