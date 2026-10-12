import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";


// =====================================================
// LOGIN USER
// =====================================================

export const loginUser = async (email, password) => {

    const response = await axios.post(
        `${API_URL}/login`,
        {
            email,
            password,
        },
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    return response.data;
};