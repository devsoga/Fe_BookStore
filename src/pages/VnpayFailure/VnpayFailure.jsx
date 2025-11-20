import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import animation from "~/assets/animation/pageNotFoundAnimation.json";
import Button from "~/components/Button/Button";
import { useNavigate } from "react-router-dom";
import Loading from "~/components/Loading/Loading";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import Footer from "~/components/Footer/Footer";

const VnpayFailure = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [orderInfo, setOrderInfo] = useState(null);
  const navigate = useNavigate();
  const { formatVND } = useStransferToVND();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      try {
        const vnpayOrderInfo = localStorage.getItem("vnpayOrderInfo");
        if (vnpayOrderInfo) setOrderInfo(JSON.parse(vnpayOrderInfo));
      } catch (e) {
        console.error("Error reading vnpayOrderInfo:", e);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {isLoading && <Loading />}
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8 lg:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-36 h-36 md:w-40 md:h-40 bg-gradient-to-tr from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
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
                  VNPAY Payment Failed
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Unfortunately, your VNPAY payment could not be completed.
                  Please try again or contact support for help.
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
                    Amount{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatVND(orderInfo.finalAmount)}
                    </span>
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                  <Button
                    onClick={() => {
                      // try to retry payment by going back to checkout or reopening payment flow
                      navigate(-1);
                    }}
                    content={"Retry Payment"}
                  />
                  <Button
                    onClick={() => {
                      window.location.href = "mailto:support@bookstore.com";
                    }}
                    content={"Contact Support"}
                    bgColor={"bg-transparent"}
                    textColor={"text-black"}
                    hoverBgColor={"hover:bg-black"}
                    hoverTextColor={"hover:text-white"}
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
                <h3 className="text-xs text-gray-500 uppercase">Attempted</h3>
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
          </div>
        </div>
      </div>
      <div>
        <Footer />
      </div>
    </>
  );
};

export default VnpayFailure;
