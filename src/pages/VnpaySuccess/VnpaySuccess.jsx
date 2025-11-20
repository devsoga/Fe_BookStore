import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import animation from "~/assets/animation/successPaymentAnimation.json";
import Button from "~/components/Button/Button";
import { useNavigate } from "react-router-dom";
import Loading from "~/components/Loading/Loading";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import Footer from "~/components/Footer/Footer";

const VnpaySuccess = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [orderInfo, setOrderInfo] = useState(null);
  const navigate = useNavigate();
  const { formatVND } = useStransferToVND();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Try to read VNPAY order info from localStorage
      try {
        const vnpayOrderInfo = localStorage.getItem("vnpayOrderInfo");
        if (vnpayOrderInfo) {
          const parsedInfo = JSON.parse(vnpayOrderInfo);
          setOrderInfo(parsedInfo);
          // Optional: Clear the info after reading
          // localStorage.removeItem("vnpayOrderInfo");
        }
      } catch (e) {
        console.error("Error reading VNPAY order info:", e);
      }
    }, 800);

    return () => {
      try {
        localStorage.removeItem("orderCode");
        localStorage.removeItem("recentOrder");
        localStorage.removeItem("vnpayOrderInfo");
      } catch (e) {}
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {isLoading && <Loading />}
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8 lg:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-36 h-36 md:w-40 md:h-40 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-28 h-28 md:w-32 md:h-32 bg-white/90 rounded-full flex items-center justify-center">
                    <Lottie
                      animationData={animation}
                      loop={true}
                      className="w-20 h-20 md:w-24 md:h-24"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  VNPAY Payment Successful
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Thank you — your VNPAY payment has been processed successfully
                  and your order is being prepared.
                </p>

                {orderInfo?.orderCode ? (
                  <p className="mt-3 text-sm text-gray-500">
                    Order{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      #{orderInfo.orderCode}
                    </span>
                  </p>
                ) : null}

                {orderInfo?.finalAmount ? (
                  <p className="mt-1 text-sm text-gray-500">
                    Amount paid{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatVND(orderInfo.finalAmount)}
                    </span>
                  </p>
                ) : null}

                {orderInfo?.customerInfo && (
                  <p className="mt-1 text-sm text-gray-500">
                    Customer:{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {orderInfo.customerInfo.name ||
                        orderInfo.customerInfo.email}
                    </span>
                  </p>
                )}

                <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                  <Button
                    onClick={() => {
                      try {
                        localStorage.removeItem("orderCode");
                        localStorage.removeItem("recentOrder");
                        localStorage.removeItem("vnpayOrderInfo");
                      } catch (e) {}
                      navigate("/");
                    }}
                    content={"Continue Shopping"}
                  />
                  <Button
                    onClick={() => {
                      try {
                        localStorage.removeItem("orderCode");
                        localStorage.removeItem("recentOrder");
                        localStorage.removeItem("vnpayOrderInfo");
                      } catch (e) {}
                      navigate("/order");
                    }}
                    content={"View Order"}
                    hoverTextColor={"hover:text-white"}
                    bgColor={"bg-transparent"}
                    hoverBgColor={"hover:bg-black"}
                    textColor={"text-black"}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="text-xs text-gray-500 uppercase">
                  Payment Method
                </h3>
                <p className="mt-1 flex items-center">
                  <span className="mr-2">💳</span>
                  VNPAY
                </p>
              </div>
              <div>
                <h3 className="text-xs text-gray-500 uppercase">
                  Transaction Date
                </h3>
                <p className="mt-1">
                  {orderInfo?.transactionDate ||
                    new Date().toLocaleString("vi-VN")}
                </p>
              </div>
              <div>
                <h3 className="text-xs text-gray-500 uppercase">Need Help?</h3>
                <p className="mt-1">
                  Contact{" "}
                  <a
                    href="mailto:support@bookstore.com"
                    className="text-blue-600 hover:underline"
                  >
                    support@bookstore.com
                  </a>
                </p>
              </div>
            </div>

            {/* Order Details Summary */}
            {orderInfo?.items && orderInfo.items.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-3">
                  {orderInfo.items.slice(0, 3).map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-600">
                        {item.productName} (x{item.quantity})
                      </span>
                      <span className="font-medium">
                        {formatVND(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                  {orderInfo.items.length > 3 && (
                    <div className="text-sm text-gray-500">
                      ... and {orderInfo.items.length - 3} more items
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between items-center font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">
                      {formatVND(orderInfo.finalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div>
        <Footer />
      </div>
    </>
  );
};

export default VnpaySuccess;
