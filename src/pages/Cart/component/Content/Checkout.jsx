import { useFormik } from "formik";
import React, { useContext, useEffect, useState, useRef } from "react";
import Button from "~/components/Button/Button";
import InputCustom from "~/components/InputCustom/InputCustom";
import Loading from "~/components/Loading/Loading";
import * as Yup from "yup";
import { iconArr } from "~/assets/ContentArrProject/Footer/MenuAndIcon";
import { StoreContext } from "~/contexts/StoreProvider";
import { orderService } from "~/apis/orderService";
import vnpayService from "~/apis/vnpayService";
import { sepayService } from "~/apis/sepayService";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import { useNavigate } from "react-router-dom";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { buildImageUrl } from "~/lib/utils";
import OrderSuccess from "~/pages/Cart/component/Content/OrderSuccess";

const paymentArr = [
  {
    code: "cash",
    title: "Tiền mặt",
    description: "Thanh toán khi nhận hàng",
    icon: "💵",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    selectedColor: "bg-green-100 border-green-500"
  },
  {
    code: "qr",
    title: "QR Code",
    description: "Quét mã QR để thanh toán",
    icon: "📱",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    selectedColor: "bg-blue-100 border-blue-500"
  },
  {
    code: "vnpay",
    title: "VNPAY",
    description: "Thanh toán qua VNPAY",
    icon: "💳",
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    selectedColor: "bg-purple-100 border-purple-500"
  },
  {
    code: "momo",
    title: "Ví MoMo",
    description: "Thanh toán qua ví điện tử MoMo",
    icon: "🎯",
    color: "bg-pink-50 border-pink-200 hover:bg-pink-100",
    selectedColor: "bg-pink-100 border-pink-500"
  }
];

const Checkout = () => {
  const navigate = useNavigate();
  const { formatVND } = useStransferToVND();
  const { toast } = useContext(ToastifyContext);
  const {
    listItemCart,
    totalPrice,
    coupon,
    setCoupon,
    userInfo,
    setCurrentTab,
    setOrderFunction
  } = useContext(StoreContext);

  const [selectPayment, setSelectPayment] = useState("qr");
  const [vnpayBank, setVnpayBank] = useState("NCB");
  const [loading, setLoading] = useState(false);
  const [isSuccessPayment, setIsSuccessPayment] = useState(false);
  const vnpayPollRef = useRef(null);

  const getFinalTotal = () => {
    // Compute final total following the same logic used in the JSX totals
    const originalSubtotal =
      (listItemCart || []).reduce((acc, it) => {
        const unit = Number(it.unitPrice || it.price || 0);
        const qty = Number(it.quantity ?? it.qty ?? 1);
        return acc + unit * qty;
      }, 0) || 0;

    const subtotal =
      (listItemCart || []).reduce((acc, it) => {
        const unit = Number(it.unitPrice || it.price || 0);
        const dv = Number(it.discountValue) || 0;
        let discountedPrice = unit;
        if (dv > 1) discountedPrice = Math.max(0, unit - dv);
        else if (dv > 0) discountedPrice = unit * (1 - dv);
        const qty = Number(it.quantity ?? it.qty ?? 1);
        return acc + discountedPrice * qty;
      }, 0) || 0;

    const memberDiscountPercent = Number(userInfo?.memberDiscount) || 0;
    const afterCustomerDiscount = subtotal * (1 - memberDiscountPercent);

    let couponDiscountAmount = 0;
    let finalTotal = afterCustomerDiscount;
    if (coupon && typeof coupon === "object" && coupon.value) {
      const couponValue = Number(coupon.value);
      if (couponValue < 1) {
        couponDiscountAmount = afterCustomerDiscount * couponValue;
        finalTotal = afterCustomerDiscount - couponDiscountAmount;
      } else {
        couponDiscountAmount = Math.min(couponValue, afterCustomerDiscount);
        finalTotal = Math.max(0, afterCustomerDiscount - couponDiscountAmount);
      }
    }

    return Math.round(finalTotal);
  };

  const formik = useFormik({
    initialValues: {
      phoneNumber: "",
      promotionCode: "",
      address: "",
      paymentMethod: "qr",
      note: ""
    },
    validationSchema: Yup.object({
      phoneNumber: Yup.string()
        .matches(
          /^[0-9]{10,15}$/,
          "Phone number must be between 10 and 15 digits"
        )
        .required("Phone number is required"),
      promotionCode: Yup.string().max(
        50,
        "Promotion code must be less than 50 characters"
      ),
      address: Yup.string().required("Address is required"),
      paymentMethod: Yup.string().required("Payment method is required"),
      note: Yup.string().max(500, "Note must be less than 500 characters")
    }),
    onSubmit: (values) => {
      // Map cart items to details array with productCode, quantity, and promotionCode
      const details = listItemCart.map((entry) => {
        const it = entry?.item ? entry.item : entry;
        const productCode =
          it.productCode || it.productId || it.id || it._id || "";
        const quantity = Number(it.quantity ?? it.qty ?? 1);
        const promotionCode = it?.promotionCode || entry?.promotionCode || null;

        const detail = {
          productCode,
          quantity
        };

        // Only add promotionCode if it exists and is not null/empty
        if (promotionCode && promotionCode.trim() !== "") {
          detail.promotionCode = promotionCode;
        }

        return detail;
      });

      // Extract customer promotion info from userInfo (localStorage)
      const promotionCustomerCode = userInfo?.promotion_code || null;
      const promotionCustomerValue = Number(userInfo?.memberDiscount) || 0;

      // Extract coupon info from coupon state (ShoppingCart input)
      const couponCode =
        coupon && typeof coupon === "object" && coupon.code
          ? coupon.code
          : null;
      const couponDiscountValue =
        coupon && typeof coupon === "object" && coupon.value
          ? Number(coupon.value)
          : 0;

      const data = {
        customerCode:
          userInfo?.customerCode || userInfo?._id || userInfo?.userId || "",
        employeeCode: "",
        // Customer promotion from userInfo
        promotionCustomerCode: promotionCustomerCode,
        promotionCustomerValue: promotionCustomerValue,
        // Coupon from shopping cart
        couponCode: couponCode,
        couponDiscountValue: couponDiscountValue,
        orderType: "Online",
        paymentMethod:
          values.paymentMethod === "cash"
            ? "Cash"
            : values.paymentMethod === "qr"
            ? "QR"
            : values.paymentMethod === "vnpay"
            ? "VNPAY"
            : values.paymentMethod === "momo"
            ? "Momo"
            : "QR",
        discount: 0, // Set to 0 as per your specification
        note: values.note || "",
        address: values.address || "",
        phoneNumber: values.phoneNumber || "",
        details: details
      };

      orderService
        .createOrder(data)
        .then(async (res) => {
          const orderResponse = res.data;
          // store order in context for OrderPayment step to pick up
          setOrderFunction(orderResponse.data || orderResponse);

          // For VNPAY, call backend to create payment and redirect to paymentUrl
          if (values.paymentMethod === "vnpay") {
            const amount = getFinalTotal();
            const bankCode = vnpayBank || "NCB";

            // Save order info to localStorage for VnpaySuccess page
            try {
              const vnpayOrderInfo = {
                orderCode:
                  (orderResponse?.data || orderResponse)?.orderCode ||
                  (orderResponse?.data || orderResponse)?.code ||
                  (orderResponse?.data || orderResponse)?.orderId,
                finalAmount: amount,
                customerInfo: {
                  name:
                    userInfo?.customerName ||
                    userInfo?.fullName ||
                    userInfo?.name,
                  email: userInfo?.email,
                  phone: values.phoneNumber,
                  address: values.address
                },
                items: listItemCart.map((item) => ({
                  productName: item.productName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice
                })),
                paymentMethod: "VNPAY",
                transactionDate: new Date().toLocaleString("vi-VN"),
                bankCode: bankCode
              };
              localStorage.setItem(
                "vnpayOrderInfo",
                JSON.stringify(vnpayOrderInfo)
              );
            } catch (e) {
              console.error("Error saving VNPAY order info:", e);
            }

            // try to extract orderCode from the createOrder response
            let orderCodeToSend = null;
            try {
              const created = orderResponse?.data || orderResponse || {};
              orderCodeToSend =
                created.orderCode ||
                created.code ||
                created.orderId ||
                created._id ||
                created.id ||
                null;
            } catch (e) {
              orderCodeToSend = null;
            }

            try {
              const vres = await vnpayService.createPayment(
                amount,
                bankCode,
                orderCodeToSend
              );
              const paymentUrl =
                vres?.data?.paymentUrl || vres?.data?.data?.paymentUrl;
              if (paymentUrl) {
                // Redirect in the current tab to the VNPAY payment URL.
                // Per request: do not open a new tab and do not show the success toast here.
                window.location.href = paymentUrl;
                return;
              } else {
                console.warn("VNPAY response missing paymentUrl:", vres);
                setCurrentTab(2);
                toast.error(
                  "VNPAY did not return a payment URL. Please contact support."
                );
                return;
              }
            } catch (vErr) {
              console.error("VNPAY createPayment failed", vErr);
              setCurrentTab(2);
              toast.error(
                "Failed to initiate VNPAY payment. Please try again later."
              );
              return;
            }
          }

          // Move to Order Status step for other payment methods
          setCurrentTab(2);
          toast.success("Order created successfully!");
        })
        .catch((err) => {
          console.log(err);
          toast.error("Something wrong. Try it later!");
        });
    }
  });

  // no editable customerName field — customer name is taken from logged-in user info

  useEffect(() => {
    return () => {
      setCoupon(null);
      // cleanup any running vnpay polling when component unmounts
      if (vnpayPollRef.current) {
        clearInterval(vnpayPollRef.current);
        vnpayPollRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {loading && <Loading />}
      {isSuccessPayment && (
        <div>
          <OrderSuccess />
        </div>
      )}
      {!isSuccessPayment && (
        <form onSubmit={formik.handleSubmit}>
          <div className="flex flex-wrap xl:flex-nowrap gap-3">
            <div className="w-full xl:w-4/6">
              {/* removed separate Customer Information section to match API payload structure */}

              {/* shipping & contact (simplified to match API) */}
              <div>
                <h2 className="pt-10 pb-3 border-b-2 uppercase text-xl">
                  Shipping & Contact
                </h2>
                <div className="mt-5">
                  {/* show logged in user name (not editable) */}
                  {userInfo && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500">
                        Recipient:{" "}
                        <strong>
                          {userInfo.customerName ||
                            userInfo.fullName ||
                            userInfo.name ||
                            userInfo.email}
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <InputCustom
                      id={"phoneNumber"}
                      label={"Phone Number"}
                      type={"text"}
                      placeholder={"0912345678"}
                      require={true}
                      formik={formik}
                    />
                  </div>

                  <div className="mt-3">
                    <InputCustom
                      id={"address"}
                      label={"Delivery address"}
                      type={"text"}
                      placeholder={"123 Đường A, Quận B"}
                      require={true}
                      formik={formik}
                    />
                  </div>

                  {/* employeeCode removed — defaults to null in payload */}

                  <h2 className="pt-3 pb-5 border-t-2 uppercase text-xl">
                    Additional Information
                  </h2>
                  <div>
                    <h2>Order notes (optional)</h2>
                    <textarea
                      id="note"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.note}
                      className="border w-full p-5 text-xl"
                      name="note"
                      placeholder="Giao giờ hành chính"
                      rows={3}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full xl:w-2/6">
              <div className="px-5 py-10 border-2 border-black space-y-5">
                <h2 className="text-xl">YOUR ORDER</h2>
                <div className="w-full border"></div>
                {/* list item */}
                {listItemCart.map((item) => {
                  const {
                    id,
                    image,
                    productName,
                    unitPrice,
                    quantity,
                    productCode,
                    totalAmount,
                    discountValue
                  } = item;

                  // Calculate discounted price: discountValue <=1 is percentage, >1 is fixed amount
                  const dv = Number(discountValue) || 0;
                  let discountedPrice = Number(unitPrice) || 0;
                  if (dv > 1) {
                    discountedPrice = Math.max(0, Number(unitPrice) - dv);
                  } else if (dv > 0) {
                    discountedPrice = Number(unitPrice) * (1 - dv);
                  }
                  const displayedTotal = Number(quantity) * discountedPrice;

                  return (
                    <div className="flex space-x-5" key={id || productCode}>
                      <img
                        src={buildImageUrl(image)}
                        alt=""
                        className="w-28 h-32"
                      />
                      <div className="flex flex-col space-y-2">
                        <h2 className="text-xl font-bold">{productName}</h2>
                        <p>
                          {quantity} *{" "}
                          {dv > 0 ? (
                            <span className="flex flex-col">
                              <span className="line-through text-sm text-gray-400">
                                {formatVND(unitPrice)}
                              </span>
                              <span className="text-green-600">
                                {formatVND(discountedPrice)}
                              </span>
                              <span className="text-xs text-red-500">
                                {dv > 1
                                  ? `-${formatVND(dv)}`
                                  : `-${Math.round(dv * 100)}%`}
                              </span>
                            </span>
                          ) : (
                            <span>{formatVND(unitPrice)}</span>
                          )}
                        </p>
                        <p>total: {formatVND(displayedTotal)}</p>
                      </div>
                    </div>
                  );
                })}

                <div className="w-full border"></div>
                {/* coupon info (applied from ShoppingCart) */}
                {coupon && typeof coupon === "object" && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <h3 className="text-green-700 font-medium">
                      {coupon.name}
                    </h3>
                    {coupon.description && (
                      <p className="text-green-600 text-sm">
                        {coupon.description}
                      </p>
                    )}
                    <p className="text-green-600 text-sm">
                      Discount:{" "}
                      {coupon.value < 1
                        ? `${Math.round(coupon.value * 100)}%`
                        : `${formatVND(coupon.value)}`}
                    </p>
                  </div>
                )}
                {/* totals and discounts */}
                {(() => {
                  // Compute original subtotal and discounted subtotal (discountValue is percent)
                  const originalSubtotal =
                    (listItemCart || []).reduce((acc, it) => {
                      const unit = Number(it.unitPrice || it.price || 0);
                      const qty = Number(it.quantity ?? it.qty ?? 1);
                      return acc + unit * qty;
                    }, 0) || 0;

                  const subtotal =
                    (listItemCart || []).reduce((acc, it) => {
                      const unit = Number(it.unitPrice || it.price || 0);
                      const dv = Number(it.discountValue) || 0;
                      let discountedPrice = unit;
                      if (dv > 1) {
                        discountedPrice = Math.max(0, unit - dv);
                      } else if (dv > 0) {
                        discountedPrice = unit * (1 - dv);
                      }
                      const qty = Number(it.quantity ?? it.qty ?? 1);
                      return acc + discountedPrice * qty;
                    }, 0) || 0;

                  const productDiscountAmount = Math.max(
                    0,
                    originalSubtotal - subtotal
                  );

                  // 1) Apply customer/member discount (after product-level discounts)
                  const memberDiscountPercent =
                    Number(userInfo?.memberDiscount) || 0;
                  const afterCustomerDiscount =
                    subtotal * (1 - memberDiscountPercent);
                  const memberDiscountAmount = subtotal - afterCustomerDiscount;

                  // 2) Apply coupon discount on amount after customer discount
                  let couponDiscountAmount = 0;
                  let finalTotal = afterCustomerDiscount;
                  if (coupon && typeof coupon === "object" && coupon.value) {
                    const couponValue = Number(coupon.value);
                    if (couponValue < 1) {
                      // percentage coupon
                      couponDiscountAmount =
                        afterCustomerDiscount * couponValue;
                      finalTotal = afterCustomerDiscount - couponDiscountAmount;
                    } else {
                      // fixed amount coupon
                      couponDiscountAmount = Math.min(
                        couponValue,
                        afterCustomerDiscount
                      );
                      finalTotal = Math.max(
                        0,
                        afterCustomerDiscount - couponDiscountAmount
                      );
                    }
                  }

                  return (
                    <>
                      <div className="flex justify-between">
                        <h2>Subtotal: </h2>
                        <p>{formatVND(subtotal)}</p>
                      </div>

                      <div>
                        <h2>Discount: </h2>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <h2>{userInfo?.customerTypeName}</h2>
                        <p>
                          <span className="text-red-500">
                            -{formatVND(memberDiscountAmount)}
                          </span>
                        </p>
                      </div>

                      {/* Product-level discounts (from discountValue on items) */}
                      <div className="flex justify-between text-sm text-gray-600">
                        <h2>Product discounts</h2>
                        <p>
                          <span className="text-red-500">
                            -{formatVND(productDiscountAmount)}
                          </span>
                        </p>
                      </div>

                      <div className="flex justify-between text-sm text-gray-600">
                        <h2
                          className={
                            coupon && typeof coupon === "object"
                              ? "font-medium"
                              : "text-gray-600"
                          }
                        >
                          {coupon && typeof coupon === "object"
                            ? coupon.code
                            : "No coupon"}
                        </h2>
                        <p>
                          {coupon && typeof coupon === "object" ? (
                            <span className="text-red-500">
                              -{formatVND(couponDiscountAmount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </p>
                      </div>

                      <div className="w-full border"></div>

                      <div className="flex justify-between text-xl uppercase font-bold">
                        <h2>Total: </h2>
                        <p>{formatVND(finalTotal)}</p>
                      </div>
                    </>
                  );
                })()}
                <div className="w-full border"></div>
                {/* Modern payment method selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Chọn phương thức thanh toán
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentArr.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setSelectPayment(item.code);
                          formik.setFieldValue("paymentMethod", item.code);
                        }}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          selectPayment === item.code
                            ? item.selectedColor +
                              " shadow-md transform scale-105"
                            : item.color + " hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-3xl">{item.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {item.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Selection indicator */}
                        {selectPayment === item.code && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Selected payment description */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {paymentArr.find((p) => p.code === selectPayment)?.icon}
                      </span>
                      <span className="font-medium text-gray-900">
                        {
                          paymentArr.find((p) => p.code === selectPayment)
                            ?.title
                        }
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {
                        paymentArr.find((p) => p.code === selectPayment)
                          ?.description
                      }
                    </p>
                  </div>
                  {selectPayment === "vnpay" && (
                    <div className="mt-4">
                      <label className="text-sm text-gray-600">
                        Chọn ngân hàng
                      </label>
                      <select
                        value={vnpayBank}
                        onChange={(e) => setVnpayBank(e.target.value)}
                        className="w-full border rounded mt-2 p-2"
                      >
                        <option value="NCB">NCB</option>
                        {/* future banks can be added here */}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        Hiện tại chỉ hỗ trợ NCB
                      </p>
                    </div>
                  )}
                </div>
                {/* btn checkout */}
                <div>
                  <Button type="submit" content={"PLACE ORDER"} w="w-full" />
                  <div className="border py-5 px-10 mt-20">
                    <h2 className="text-center bg-white -translate-y-8 text-xl">
                      GURANTED <span className="text-green-500">SAFE</span>{" "}
                      CHECKOUT
                    </h2>
                    <div className="flex flex-wrap justify-center items-center gap-3 text-5xl ">
                      {iconArr.map((item) => (
                        <p>{item}</p>
                      ))}
                    </div>
                  </div>
                  <h2 className="text-center mt-3">
                    Your Payment is 100% Secure
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Invoice modal is shown on the Order Status step (OrderPayment) now */}
    </>
  );
};

export default Checkout;
