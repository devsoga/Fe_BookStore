import { useFormik } from "formik";
import React, { useContext, useEffect, useState } from "react";
import Button from "~/components/Button/Button";
import InputCustom from "~/components/InputCustom/InputCustom";
import * as Yup from "yup";
import { iconArr } from "~/assets/ContentArrProject/Footer/MenuAndIcon";
import { StoreContext } from "~/contexts/StoreProvider";
import { orderService } from "~/apis/orderService";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import { useNavigate } from "react-router-dom";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { buildImageUrl } from "~/lib/utils";

const paymentArr = [
  {
    code: "online",
    title: "Check payments",
    description:
      "Please send a check to Store Name, Store Street, Store Town, Store State / County, Store Postcode."
  },
  {
    code: "cash",
    title: "Cash on delivery",
    description: "Pay with cash upon delivery."
  }
];

const Checkout = () => {
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

  const [selectPayment, setSelectPayment] = useState("online");

  const formik = useFormik({
    initialValues: {
      phoneNumber: "",
      promotionCode: "",
      address: "",
      paymentMethod: "online",
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
        paymentMethod: values.paymentMethod === "cash" ? "Cash" : "QR",
        discount: 0, // Set to 0 as per your specification
        note: values.note || "",
        address: values.address || "",
        phoneNumber: values.phoneNumber || "",
        details: details
      };

      orderService
        .createOrder(data)
        .then((res) => {
          const orderResponse = res.data;
          // store order in context for OrderPayment step to pick up
          setOrderFunction(orderResponse.data || orderResponse);

          // Move to Order Status step for both payment methods
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
    };
  }, []);

  return (
    <>
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
                  <h3 className="text-green-700 font-medium">{coupon.name}</h3>
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
                    couponDiscountAmount = afterCustomerDiscount * couponValue;
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
              {/* select box payment */}
              <div>
                {paymentArr.map((item) => (
                  <div className="text-third">
                    <label className="flex items-center space-x-2 mb-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={item.code}
                        onChange={(e) => {
                          formik.handleChange(e);
                          setSelectPayment(item.code);
                        }}
                        onBlur={formik.handleBlur}
                        checked={
                          selectPayment === item.code ||
                          formik.values.paymentMethod === item.code
                        } // check theo formik
                      />
                      <span
                        className={`${
                          item.code == selectPayment && "text-black"
                        } text-lg`}
                      >
                        {item.title}
                      </span>
                    </label>

                    <div
                      className={`transition-all duration-500 overflow-hidden ${
                        selectPayment == item.code
                          ? "max-h-20 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <p className="px-5">{item.description}</p>
                    </div>
                  </div>
                ))}
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

      {/* Invoice modal is shown on the Order Status step (OrderPayment) now */}
    </>
  );
};

export default Checkout;
