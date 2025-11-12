import React, { use, useContext, useEffect, useState } from "react";
import HeaderSidebar from "../../components/HeaderSidebar";
import ProductItemInSidebar from "../../components/ProductItemInSidebar";
import Button from "~/components/Button/Button";
import EmptySidebar from "./EmptySidebar";
import { StoreContext } from "~/contexts/StoreProvider";
import { Link } from "react-router-dom";
import { SidebarContext } from "~/contexts/SidebarProvider";
import { useStransferToVND } from "~/hooks/useStransferToVND";

const CartSidebar = ({ titleSidebar }) => {
  // store information
  const { userInfo, listItemCart, totalPrice } = useContext(StoreContext);
  const { setIsOpenSidebar } = useContext(SidebarContext);
  const safeCartList = Array.isArray(listItemCart) ? listItemCart : [];
  const listItemCartRender = [...safeCartList].reverse();
  console.log(listItemCart);
  const [hasItems, setHasItems] = useState(false);
  const { formatVND } = useStransferToVND();

  // compute cart totals locally (respecting item.promotion.value) so UI reflects discounts
  let cartBaseTotal = 0;
  let cartFinalTotal = 0;
  safeCartList.forEach((entry) => {
    const item = entry?.item ? entry.item : entry;
    if (!item) return;
    const qty = Number(item.quantity ?? item.qty ?? 1) || 0;
    const base = Number(item.unitPrice ?? item.price ?? 0) || 0;
    let final = base;
    // support different promotion shapes (promotion.value or discountValue)
    const promoRaw =
      item?.promotion?.value ??
      item?.discountValue ??
      item?.discount?.value ??
      item?.discountAmount ??
      null;
    if (promoRaw != null) {
      const v = Number(promoRaw);
      if (!Number.isNaN(v) && v > 0) {
        if (v <= 1) final = Math.round(base * (1 - v));
        else final = Math.max(0, base - v);
      }
    }
    cartBaseTotal += base * qty;
    cartFinalTotal += final * qty;
  });
  const cartSaving = Math.max(0, cartBaseTotal - cartFinalTotal);

  useEffect(() => {
    setHasItems(
      userInfo && Array.isArray(listItemCart) && listItemCart.length > 0
    );
  }, [userInfo, listItemCart]);

  return (
    <>
      <div className="p-5 flex flex-col justify-between h-full border space-y-5">
        <HeaderSidebar titleSidebar={titleSidebar} />
        <div className="flex-1 overflow-y-auto">
          {hasItems ? (
            listItemCartRender.map((entry, idx) => {
              // entry may be { _id, item: { ... } } or the item itself
              const cartId = entry?._id || entry?.id || entry?.cartId || null;
              const innerItem = entry?.item ? entry.item : entry;
              const key =
                cartId || innerItem?.productCode || innerItem?.id || idx;
              return (
                <ProductItemInSidebar
                  key={key}
                  item={innerItem}
                  cartId={cartId}
                />
              );
            })
          ) : (
            <EmptySidebar title={titleSidebar.title} />
          )}
        </div>
        {hasItems && (
          <>
            {" "}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <p>Total price: </p>
                <p className="text-gray-600">{formatVND(cartFinalTotal)}</p>
              </div>
              {cartSaving > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <p>You save:</p>
                  <p>{formatVND(cartSaving)}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Link to={"/cart"}>
                <Button
                  onClick={() => {
                    setIsOpenSidebar(false);
                  }}
                  content={"VIEW CART"}
                  w="w-full"
                />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
