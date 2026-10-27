
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/my-bookings", { replace: true });
  }, [navigate]);

  return null;
};

export default PaymentSuccess;
