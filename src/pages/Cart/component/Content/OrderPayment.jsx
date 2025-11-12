import React, { useContext, useEffect, useState } from "react";
import { StoreContext } from "~/contexts/StoreProvider";
import "./style.scss";
import { MdOutlineFileDownload } from "react-icons/md";
import { BsBank } from "react-icons/bs";
import { IoCopy } from "react-icons/io5";
import Button from "~/components/Button/Button";
import QrPaymentCountdown from "./QrPaymentCountdown";
import { orderService } from "~/apis/orderService";
import { historyTransferService } from "~/apis/historyTransferService";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import { useNavigate } from "react-router-dom";
import OrderSuccess from "~/pages/Cart/component/Content/OrderSuccess";
import InvoiceModal from "~/components/InvoiceModal/InvoiceModal";
import { useCopyText } from "~/hooks/useCopyText";

const OrderPayment = () => {
  let interval;
  const { handleCopy } = useCopyText();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { toast } = useContext(ToastifyContext);
  const [isCash, setIsCash] = useState(false);
  const { order, setCurrentTab, setOrderFunction } = useContext(StoreContext);

  const _id = order?._id || order?.id || order?.orderCode || "";
  const totalPriceOrder =
    order?.totalPriceOrder || order?.totalAmount || order?.finalAmount || 0;
  const [isSuccessPayment, setIsSuccessPayment] = useState(false);
  // const imgURL = `https://qr.sepay.vn/img?acc=VQRQADYBO0539&bank=MBBank&amount=${totalPriceOrder}&des=${_id}`;
  const imgURL = `https://qr.sepay.vn/img?acc=VQRQADYBO0539&bank=MBBank&amount=100000&des=$khoinguyen`;

  const VAInfo = {
    accountNumber: "VQRQADYBO0539",
    accountOwner: "DANG KHOI NGUYEN"
  };

  const handleExpire = (interval) => {
    // TODO: khóa đơn/hủy QR/ gọi API tạo QR mới
    clearInterval(interval);
    toast.warning("Payment time has expired!");

    navigate("/");
  };

  const handleSuccess = (message) => {
    toast.success(message);
    clearInterval(interval);
    localStorage.removeItem("countdownEndTime");
  };

  // const handleCheckPayment = () => {
  //   const data = { id: _id };
  //   orderService
  //     .findOneById(data)
  //     .then((res) => {
  //       if (res.data.paymentMethod == "cash") {
  //         setIsCash(true);
  //         return;
  //       }

  //       if (res.data.isPayment !== false) {
  //         clearInterval(interval);
  //         historyTransferService
  //           .findOneByOrderId({ orderId: _id })
  //           .then((res) => {
  //             setIsSuccessPayment(res.data.success);
  //             res.data.success
  //               ? handleSuccess(res.data.success)
  //               : toast.error(res.data.message);
  //           })
  //           .catch();
  //       }
  //     })
  //     .catch();
  // };

  // useEffect(() => {
  //   interval = setInterval(() => {
  //     handleCheckPayment();
  //   }, 5000);
  // }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      setOrderFunction(null);
      setCurrentTab(0);
    };
  }, []);

  useEffect(() => {
    // show invoice modal when the order provided by context is a cash payment
    if (
      order &&
      (order.paymentMethod || "").toString().toLowerCase() === "cash"
    ) {
      setIsCash(true);
    } else {
      setIsCash(false);
    }
  }, [order]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-5">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <h2 className="text-xl font-semibold text-gray-600">
          Preparing your payment screen...
        </h2>
      </div>
    );
  }

  return (
    <>
      {isCash && (
        <>
          <div className="flex flex-col text-center items-center justify-center space-y-5 h-full">
            <h2 className="text-xl">Your order is being processed </h2>
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  navigate("/");
                }}
                content={"Go back to shop"}
              />
              <Button
                onClick={() => {
                  navigate("/order");
                }}
                content={"See your order status"}
                hoverTextColor={"hover:text-white"}
                bgColor={"bg-transparent"}
                hoverBgColor={"hover:bg-black"}
                textColor={"text-black"}
              />
            </div>
          </div>

          {/* show invoice modal for cash orders */}
          {order && (
            <InvoiceModal
              order={order}
              onClose={() => {
                // clear order and send user back to shopping
                setOrderFunction(null);
                setCurrentTab(0);
                navigate("/");
              }}
            />
          )}
        </>
      )}

      {isSuccessPayment && (
        <div>
          <OrderSuccess />
        </div>
      )}
      {!isCash && !isSuccessPayment && (
        <>
          <div className="w-full">
            <QrPaymentCountdown
              onExpire={() => {
                handleExpire(interval);
              }}
            />
          </div>
          <div className="flex flex-col items-center justify-center mt-5 space-y-3">
            <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            <h2>Waiting for your transfer</h2>
          </div>
          <div className="flex flex-wrap justify-between gap-20 mt-20">
            {/* left  */}
            <div className="flex flex-col justify-center items-center space-y-5">
              <h2 className="text-3xl font-bold">Scan this QR Code</h2>
              <div
                style={{
                  boxShadow:
                    "rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px"
                }}
                className="relative"
              >
                <div className="relative w-64 h-64 overflow-hidden">
                  <img
                    src={imgURL}
                    alt="qr"
                    className="w-full h-full object-contain"
                  />

                  {/* Scan line */}
                  <div className="absolute inset-0">
                    <div className="scan-line"></div>
                  </div>
                </div>
              </div>
              {/* download */}
              <div>
                <Button
                  content={
                    <>
                      {" "}
                      <div className="flex items-center space-x-5 text-xl py-1">
                        <span>
                          <MdOutlineFileDownload />
                        </span>
                        <p>Download QR Code</p>
                      </div>
                    </>
                  }
                />
              </div>
            </div>
            {/* right */}
            <div className="bg-black flex flex-col flex-1 space-y-5 p-5 rounded-lg text-white">
              {/* title */}
              <div className="flex justify-start items-center space-x-5">
                <span className="border-2 p-5 rounded-full text-3xl">
                  <BsBank />
                </span>
                <div>
                  <h2 className="text-5xl font-bold">MBBank</h2>
                  <p className="text-third">Bank Transfer</p>
                </div>
              </div>
              {/* info */}
              <div className="flex justify-between border-b pb-5">
                <h2 className="uppercase text-third">account owner</h2>
                <p className="text-xl">{VAInfo.accountOwner}</p>
              </div>
              <div className="flex justify-between border-b pb-5">
                <h2 className="uppercase text-third">account number</h2>
                <div className="flex items-center space-x-3">
                  <p className="text-xl">{VAInfo.accountNumber}</p>
                  <span
                    className="cursor-pointer text-xl hover:opacity-30"
                    onClick={() => {
                      handleCopy(VAInfo.accountNumber);
                    }}
                  >
                    <IoCopy />
                  </span>
                </div>
              </div>
              <div className="flex justify-between border-b pb-5">
                <h2 className="uppercase text-third">price</h2>

                <div className="flex items-center space-x-3">
                  <p className="text-xl">
                    {new Intl.NumberFormat("vi-VN").format(totalPriceOrder)}
                  </p>
                  <span
                    className="cursor-pointer text-xl hover:opacity-30"
                    onClick={() => {
                      handleCopy(totalPriceOrder);
                    }}
                  >
                    <IoCopy />
                  </span>
                </div>
              </div>
              <div className="flex justify-between border-b pb-5">
                <h2 className="uppercase text-third">transfer content</h2>
                <div className="flex items-center space-x-3">
                  <p className="text-xl">{_id}</p>
                  <span
                    className="cursor-pointer text-xl hover:opacity-30"
                    onClick={() => {
                      handleCopy(_id);
                    }}
                  >
                    <IoCopy />
                  </span>
                </div>
              </div>
              {/* totalPrice */}
              <div className="flex justify-between py-5">
                <h2 className="uppercase text-3xl font-bold">total price</h2>
                <p className="text-3xl text-red-500">
                  {new Intl.NumberFormat("vi-VN").format(totalPriceOrder)} VND
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default OrderPayment;
