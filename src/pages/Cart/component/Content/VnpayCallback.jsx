import React, { useEffect, useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { orderService } from "~/apis/orderService";
import Loading from "~/components/Loading/Loading";
import { ToastifyContext } from "~/contexts/ToastifyProvider";

const VnpayCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useContext(ToastifyContext) || {};
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const respCode =
          params.get("vnp_ResponseCode") ||
          params.get("code") ||
          params.get("vnp_TransactionStatus");
        const message = params.get("message") || null;

        // Extract order code from vnp_OrderInfo if present
        const rawOrderInfo =
          params.get("vnp_OrderInfo") || params.get("vnp_OrderInfo") || "";
        const decoded = decodeURIComponent(rawOrderInfo || "");
        // try to find a numeric order code in the order info
        const match = decoded.match(/(\d{4,})/);
        const orderCodeFromInfo = match ? match[0] : null;

        // treat '00' as success (VNPAY typical success code)
        if (respCode === "00" || respCode === "0") {
          if (toast && toast.success)
            toast.success("Payment successful. Preparing order summary...");

          // try fetch order details from backend if we have a code
          if (orderCodeFromInfo) {
            try {
              const res = await orderService.getOrderByCode(orderCodeFromInfo);
              const data = res?.data || res;

              // persist a small recentOrder payload so OrderSuccess can display summary
              const recent = {
                orderCode: data?.orderCode || orderCodeFromInfo,
                finalAmount:
                  data?.finalAmount || data?.totalAmount || data?.amount || null
              };
              try {
                localStorage.setItem("recentOrder", JSON.stringify(recent));
              } catch (e) {}
            } catch (err) {
              // ignore fetch errors but continue to success screen
              console.warn(
                "Failed to fetch order by code",
                orderCodeFromInfo,
                err
              );
            }
          }

          // navigate to VNPAY success page
          navigate("/vnpay-success");
          return;
        }

        // Non-success handling: show message and redirect to cart or order page
        if (toast && toast.error) {
          const errMsg = message || "Payment not successful";
          toast.error(errMsg);
        }
        navigate("/cart");
      } catch (err) {
        console.error("VNPAY callback handling error", err);
        try {
          if (toast && toast.error)
            toast.error("Unable to process payment callback");
        } catch (e) {}
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (loading) return <Loading />;

  return null;
};

export default VnpayCallback;
