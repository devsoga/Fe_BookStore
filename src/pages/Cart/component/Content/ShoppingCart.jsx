import React, { useContext, useEffect, useRef, useState } from "react";
import { buildImageUrl } from "~/lib/utils";
import { FaRegTrashAlt } from "react-icons/fa";

import InputNumberCustom from "../InputNumberCustom/InputNumberCustom";
import Button from "~/components/Button/Button";
import { iconArr } from "~/assets/ContentArrProject/Footer/MenuAndIcon";
import { StoreContext } from "~/contexts/StoreProvider";
import { showConfirmToast } from "~/utils/showConfirmToast";
import { cartService } from "~/apis/cartService";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import Loading from "~/components/Loading/Loading";
import { useNavigate } from "react-router-dom";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { couponService } from "~/apis/couponService";

const ShoppingCart = () => {
  const { formatVND } = useStransferToVND();
  const [isEmptyCouponNotification, setIsEmptyCouponNotification] =
    useState("");
  const {
    userInfo,
    listItemCart,
    totalPrice,
    setListItemCart,
    setCountItem,
    totalItem,
    coupon,
    setCoupon,
    setCurrentTab
  } = useContext(StoreContext);

  console.log(listItemCart);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef();
  const { toast } = useContext(ToastifyContext);

  const handleCoupon = async (code) => {
    if (!code || code.trim() === "") return null;
    try {
      const res = await couponService.getByCode(code.trim());
      const found = res?.data?.data || res?.data;
      if (!found) {
        toast.error("Coupon code not found");
        return "unvalid";
      }
      if (found.status === false) {
        toast.error("Coupon has expired");
        return "expired";
      }

      return {
        code: found.couponCode,
        name: found.couponName,
        value: found.value,
        description: found.description,
        promotionTypeName: found.promotionTypeName
      };
    } catch (err) {
      // If backend returns 404 or not found, treat as invalid
      if (err?.response?.status === 404) {
        toast.error("Coupon code not found");
        return "unvalid";
      }
      console.error("Coupon fetch error:", err);
      toast.error("Failed to validate coupon");
      return "unvalid";
    }
  };
  const deleteCart = (cartId) => {
    console.log(cartId);
    showConfirmToast({
      message: "Are you sure delete this item?",
      onConfirm: () => {
        // cartService.deleteCart expects customerCode and productCode
        const customerCode =
          userInfo?.customerCode || userInfo?._id || userInfo?.userId || null;
        if (!customerCode) {
          toast.error("User not identified. Please login.");
          return;
        }

        cartService
          .deleteCart({ customerCode, productCode: cartId })
          .then(() => {
            toast.success("Delete successfully!");
            fetchCart();
          })
          .catch(() => {
            toast.error("Failed to delete item");
          });
      }
    });
  };
  const deleteAllCart = () => {
    showConfirmToast({
      message: "Are you sure delete all cart?",
      onConfirm: () => {
        const customerCode =
          userInfo?.customerCode || userInfo?._id || userInfo?.userId || null;
        if (!customerCode) {
          toast.error("User not identified. Please login.");
          return;
        }

        cartService
          .deleteAllCart(customerCode)
          .then(() => {
            toast.success("All items deleted");
            fetchCart();
          })
          .catch(() => {
            toast.error("Failed to clear cart");
          });
      }
    });
  };
  // fetch cart helper
  const fetchCart = () => {
    if (!userInfo) {
      setListItemCart([]);
      setCountItem(0);
      return;
    }

    const customerCode =
      userInfo?.customerCode || userInfo?._id || userInfo?.userId || null;
    if (!customerCode) return;

    cartService
      .getAllCart(customerCode)
      .then((res) => {
        const list = res?.data?.data || res?.data || [];
        setListItemCart(list);
        setCountItem(totalItem(list));
      })
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    fetchCart();
  }, [userInfo]);

  return (
    <>
      {loading && <Loading />}

      {listItemCart && (
        <div className="flex flex-wrap">
          <div className="w-full xl:w-3/5">
            {/* Bản responsive */}
            <div className="hidden md:block overflow-x-auto">
              {/* Desktop Table */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3">PRODUCT</th>
                    <th className="text-center"></th>
                    <th className="text-center">PRICE</th>
                    <th className="text-center">SKU</th>
                    <th className="text-center">QUANTITY</th>
                    <th className="text-center">TOTALPRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {listItemCart?.map((item) => {
                    const {
                      id,
                      image,
                      productCode,
                      productName,
                      quantity,
                      totalAmount,
                      unitPrice,
                      discountValue
                    } = item;

                    // Calculate discounted price
                    // If discountValue <= 1 => treat as percentage (e.g., 0.2 = 20%)
                    // If discountValue > 1 => treat as absolute amount to subtract from unit price
                    const dv = Number(discountValue) || 0;
                    let discountedPrice = Number(unitPrice) || 0;
                    if (dv > 1) {
                      // absolute discount
                      discountedPrice = Math.max(0, Number(unitPrice) - dv);
                    } else if (dv > 0) {
                      // percentage discount
                      discountedPrice = Number(unitPrice) * (1 - dv);
                    }
                    const displayedTotal = Number(quantity) * discountedPrice;

                    return (
                      <tr className="border-b">
                        <td className="py-5">
                          <div className="flex space-x-5 items-start">
                            <img
                              src={buildImageUrl(image)}
                              className="w-24"
                              alt="product"
                            />
                          </div>
                        </td>
                        <td
                          onClick={() => {
                            deleteCart(productCode);
                          }}
                          className="cursor-pointer text-center align-top py-6"
                        >
                          <FaRegTrashAlt />
                        </td>
                        <td className="text-center align-top py-5">
                          {dv > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="line-through text-sm text-gray-400">
                                {formatVND(unitPrice)}
                              </span>
                              <span className="text-sm text-green-600">
                                {formatVND(discountedPrice)}
                              </span>
                              <span className="text-xs text-red-500">
                                {dv > 1
                                  ? `-${formatVND(dv)}`
                                  : `-${Math.round(dv * 100)}%`}
                              </span>
                            </div>
                          ) : (
                            <span>{formatVND(unitPrice)}</span>
                          )}
                        </td>
                        <td className="text-center align-top py-5">
                          {productCode}
                        </td>
                        <td className="text-center align-top py-5">
                          <InputNumberCustom
                            defaultValue={{
                              quantity: quantity,
                              productCode: productCode,
                              customerCode:
                                userInfo?.customerCode || userInfo?._id
                            }}
                            inCart={true}
                            onUpdated={fetchCart}
                          />
                        </td>
                        <td className="text-center align-top py-5">
                          {formatVND(displayedTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="block md:hidden space-y-4">
              <div className="border p-4 rounded-lg">
                <div className="block md:hidden space-y-4">
                  {listItemCart?.map((item) => {
                    const {
                      image,
                      productName,
                      unitPrice,
                      productCode,
                      quantity,
                      id,
                      totalAmount,
                      discountValue
                    } = item;

                    // Calculate discounted price
                    const dv2 = Number(discountValue) || 0;
                    let discountedPrice2 = Number(unitPrice) || 0;
                    if (dv2 > 1) {
                      discountedPrice2 = Math.max(0, Number(unitPrice) - dv2);
                    } else if (dv2 > 0) {
                      discountedPrice2 = Number(unitPrice) * (1 - dv2);
                    }
                    const displayedTotal = Number(quantity) * discountedPrice2;

                    return (
                      <>
                        <div
                          key={id}
                          className="p-4 rounded-lg flex space-x-4 relative"
                        >
                          {/* Hình bên trái */}
                          <img
                            src={buildImageUrl(image)}
                            className="w-24 h-24 object-cover flex-shrink-0"
                            alt="product"
                          />

                          {/* Thông tin bên phải */}
                          <div className="flex flex-col space-y-3 flex-1">
                            <h2 className="text-lg font-semibold border-b pb-3 border-dashed">
                              {productName}
                            </h2>

                            <p className="border-b pb-3 border-dashed">
                              SKU: {productCode}
                            </p>

                            <div className="flex items-center pb-3 space-x-2 border-b border-dashed">
                              <span>Quantity:</span>
                              <InputNumberCustom
                                defaultValue={{
                                  quantity: quantity,
                                  productCode: productCode,
                                  customerCode:
                                    userInfo?.customerCode || userInfo?._id
                                }}
                                inCart={true}
                                onUpdated={fetchCart}
                              />
                              <span className="text-xs">
                                x{" "}
                                {dv2 > 0 ? (
                                  <span className="flex flex-col">
                                    <span className="line-through text-gray-400">
                                      {formatVND(unitPrice)}
                                    </span>
                                    <span className="text-green-600">
                                      {formatVND(discountedPrice2)}
                                    </span>
                                    <span className="text-red-500">
                                      {dv2 > 1
                                        ? `-${formatVND(dv2)}`
                                        : `-${Math.round(dv2 * 100)}%`}
                                    </span>
                                  </span>
                                ) : (
                                  <span>{formatVND(unitPrice)}</span>
                                )}
                              </span>
                            </div>

                            <p className="border-b pb-3 border-dashed">
                              Total: {formatVND(displayedTotal)}
                            </p>
                          </div>
                          <div
                            onClick={() => {
                              deleteCart(productCode);
                            }}
                            className="absolute top-0 right-0"
                          >
                            <FaRegTrashAlt />
                          </div>
                        </div>
                      </>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-5 items-center mt-5">
              <div className="flex w-full xl:w-3/6">
                <div className="border h-10 px-5 focus-within:border-2 focus-within:border-r-0 focus-within:border-black flex-1 ">
                  <input
                    ref={inputRef}
                    placeholder="Coupon code"
                    className="h-full w-full text-xl outline-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const couponResult = await handleCoupon(
                        inputRef.current.value
                      );

                      if (
                        couponResult === "unvalid" ||
                        couponResult === "expired"
                      ) {
                        setIsEmptyCouponNotification(true);
                        setCoupon(couponResult);
                      } else if (couponResult) {
                        setIsEmptyCouponNotification(false);
                        setCoupon(couponResult);
                        toast.success(
                          `Coupon "${couponResult.name}" applied successfully!`
                        );
                      } else {
                        setIsEmptyCouponNotification(true);
                        setCoupon(null);
                      }
                    } catch (err) {
                      console.error("Coupon validation error:", err);
                      toast.error("Failed to validate coupon");
                    }
                    setLoading(false);
                  }}
                  className="border-black border-2 px-2 hover:bg-black hover:text-white transition-colors duration-200"
                >
                  OK
                </button>
              </div>

              <div className="w-full xl:w-2/6  text-center">
                <Button
                  onClick={deleteAllCart}
                  py={"py-2"}
                  w={"w-full"}
                  content={
                    <>
                      <div className="flex space-x-3 justify-center items-center">
                        <FaRegTrashAlt />
                        <p>CLEAR CART</p>
                      </div>
                    </>
                  }
                  hoverTextColor={"hover:text-white"}
                  bgColor={"bg-transparent"}
                  hoverBgColor={"hover:bg-black"}
                  textColor={"text-black"}
                />
              </div>
            </div>
            {isEmptyCouponNotification && (
              <div className="mt-3">
                {!inputRef.current?.value ? (
                  <h2 className="text-red-500">Please enter your coupon</h2>
                ) : coupon === "expired" ? (
                  <h2 className="text-red-500">Coupon has expired</h2>
                ) : (
                  <h2 className="text-red-500">Coupon code is invalid</h2>
                )}
              </div>
            )}
            {coupon && typeof coupon === "object" && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <h3 className="text-green-700 font-medium">{coupon.name}</h3>
                <p className="text-green-600 text-sm">{coupon.description}</p>
                <p className="text-green-600 text-sm">
                  Discount:{" "}
                  {coupon.value < 1
                    ? `${Math.round(coupon.value * 100)}%`
                    : `${formatVND(coupon.value)}`}
                </p>
              </div>
            )}
          </div>

          <div className="w-full xl:w-2/5 px-5 mt-5">
            <div className="px-5 py-10 border-2 border-black space-y-5">
              <h2 className="border-b text-xl">CART TOTALS</h2>
              <div className="flex justify-between">
                <h2>Total price: </h2>
                <p>{formatVND(totalPrice(listItemCart))}</p>
              </div>
              {/* Discounts summary */}
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

                // Apply discount order: product discount already applied in subtotal
                // 1. Customer promotion discount (applied to subtotal after product discounts)
                const memberDiscountPercent =
                  Number(userInfo?.memberDiscount) || 0;
                const afterCustomerDiscount =
                  subtotal * (1 - memberDiscountPercent);
                const memberDiscountAmount = subtotal - afterCustomerDiscount;

                // 2. Coupon discount (applied to amount after customer discount)
                let couponDiscountAmount = 0;
                let finalTotal = afterCustomerDiscount;

                if (coupon && typeof coupon === "object" && coupon.value) {
                  const couponValue = Number(coupon.value);
                  if (couponValue < 1) {
                    // Percentage coupon
                    couponDiscountAmount = afterCustomerDiscount * couponValue;
                    finalTotal = afterCustomerDiscount * (1 - couponValue);
                  } else {
                    // Fixed amount coupon
                    couponDiscountAmount = Math.min(
                      couponValue,
                      afterCustomerDiscount
                    );
                    finalTotal = Math.max(
                      0,
                      afterCustomerDiscount - couponValue
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
                            : "text-gray-400"
                        }
                      >
                        {coupon && typeof coupon === "object"
                          ? coupon.code
                          : "No coupon"}
                      </h2>
                      <p>
                        {coupon &&
                        typeof coupon === "object" &&
                        couponDiscountAmount > 0 ? (
                          <span className="text-red-500">
                            -{formatVND(couponDiscountAmount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </p>
                    </div>

                    <div className="w-full border"></div>

                    <div className="flex justify-between text-3xl uppercase font-bold">
                      <h2>Total: </h2>
                      <p className="text-xl font-bold">
                        {formatVND(finalTotal)}
                      </p>
                    </div>
                  </>
                );
              })()}
              <div className="flex flex-col space-y-3">
                <div>
                  <Button
                    onClick={() => {
                      setLoading(true);
                      setTimeout(() => {
                        setLoading(false);
                        setCurrentTab(1);
                      }, 1000);
                    }}
                    type="submit"
                    content={"PROCEED TO CHECKOUT"}
                    w="w-full"
                  />
                </div>
                <div>
                  <Button
                    onClick={() => {
                      navigate("/shop");
                    }}
                    content={"CONTINUE SHOPPING"}
                    w="w-full"
                    hoverTextColor={"hover:text-white"}
                    bgColor={"bg-transparent"}
                    hoverBgColor={"hover:bg-black"}
                    textColor={"text-black"}
                  />
                </div>
              </div>
            </div>

            {/* payment */}
            <div className="border py-5 px-10 mt-20">
              <h2 className="text-center bg-white -translate-y-8 text-xl">
                GURANTED <span className="text-green-500">SAFE</span> CHECKOUT
              </h2>
              <div className="flex flex-wrap justify-center items-center gap-3 text-5xl ">
                {iconArr.map((item) => (
                  <p>{item}</p>
                ))}
              </div>
            </div>
            <h2 className="text-center mt-3">Your Payment is 100% Secure</h2>
          </div>
        </div>
      )}
    </>
  );
};

export default ShoppingCart;
