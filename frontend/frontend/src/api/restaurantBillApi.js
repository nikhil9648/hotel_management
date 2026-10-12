import axios from "axios";

const API_URL = "http://localhost:5000/api/restaurant-bills";


// ==========================================
// DOWNLOAD RESTAURANT BILL PDF
// ==========================================

export const downloadRestaurantBillPDF = async (billId) => {

    const token = localStorage.getItem("token");

    const response = await axios.get(
        `${API_URL}/${billId}/pdf`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            responseType: "blob",
        }
    );

    const blob = new Blob(
        [response.data],
        {
            type: "application/pdf",
        }
    );

    const url =
        window.URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `Restaurant-Bill-${billId}.pdf`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
};