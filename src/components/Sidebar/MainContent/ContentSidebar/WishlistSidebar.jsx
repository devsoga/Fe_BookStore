import React, { useContext, useState, useMemo, useEffect, useRef } from "react";
import HeaderSidebar from "../../components/HeaderSidebar";
import ProductItemInSidebar from "../../components/ProductItemInSidebar";
import Button from "~/components/Button/Button";
import EmptySidebar from "./EmptySidebar";
import { StoreContext } from "~/contexts/StoreProvider";
import { SidebarContext } from "~/contexts/SidebarProvider";
import { cartService } from "~/apis/cartService";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { ToastifyContext } from "~/contexts/ToastifyProvider";

const WishlistSidebar = ({ titleSidebar }) => {
  const { listItemFavorite } = useContext(StoreContext);
  const safeFavList = Array.isArray(listItemFavorite) ? listItemFavorite : [];
  const hasItems = safeFavList.length > 0;

  const [selectedMap, setSelectedMap] = useState({});
  const { setIsOpenSidebar, setTitleSidebar } = useContext(SidebarContext);
  const { toast } = useContext(ToastifyContext);
  const { setIsOnClickFunction, userInfo } = useContext(StoreContext);

  const normalized = useMemo(
    () =>
      safeFavList.map((entry, idx) => {
        const inner = entry?.item ? entry.item : entry;
        const key = entry?._id || inner?.productCode || inner?.id || idx;
        return { key, entry, inner };
      }),
    [safeFavList]
  );
  const { formatVND } = useStransferToVND();
  // selection helpers
  const selectedKeys = Object.keys(selectedMap).filter((k) => selectedMap[k]);
  const allKeys = normalized.map((n) => String(n.key));
  const isAllSelected =
    allKeys.length > 0 && selectedKeys.length === allKeys.length;
  const isAnySelected = selectedKeys.length > 0;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !isAllSelected && isAnySelected;
    }
  }, [isAllSelected, isAnySelected]);

  // calculate total savings for selected items (if any)
  const totalSelectedSaving = normalized.reduce((sum, n) => {
    const key = String(n.key);
    if (!selectedKeys.includes(key)) return sum;
    const product = n.inner || {};
    const base = Number(product.unitPrice ?? product.price ?? 0) || 0;
    const promoRaw =
      product?.promotion?.value ??
      product?.discountValue ??
      product?.discount?.value ??
      product?.discountAmount ??
      null;
    if (promoRaw == null) return sum;
    const v = Number(promoRaw);
    if (Number.isNaN(v) || v <= 0) return sum;
    let final = base;
    let saved = 0;
    if (v <= 1) {
      final = Math.round(base * (1 - v));
      saved = base - final;
    } else {
      saved = v;
      final = Math.max(0, base - saved);
    }
    return sum + saved;
  }, 0);
  return (
    <div className="p-5 flex flex-col justify-between h-full border space-y-5">
      <HeaderSidebar titleSidebar={titleSidebar} />
      <div className="flex-1 overflow-y-auto">
        {/* Select all + count */}
        {normalized.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center space-x-2 text-sm cursor-pointer select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="sr-only"
                aria-checked={isAllSelected}
                checked={isAllSelected}
                onChange={(e) => {
                  const next = {};
                  if (e.target.checked) {
                    allKeys.forEach((k) => (next[k] = true));
                  }
                  setSelectedMap(next);
                }}
              />
              <span
                className={`w-4 h-4 inline-flex items-center justify-center rounded-sm border transition-colors duration-150 ease-in-out ${
                  isAllSelected
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-gray-300"
                }`}
              >
                {isAnySelected && !isAllSelected ? (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="2"
                      rx="1"
                      fill="white"
                    />
                  </svg>
                ) : isAllSelected ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-3 h-3 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : null}
              </span>
              <span className="select-none">Select all</span>
            </label>
            <div className="text-sm text-gray-500">
              {selectedKeys.length} selected
            </div>
          </div>
        )}
        {hasItems ? (
          normalized.map(({ key, entry, inner }) => {
            const favId = entry?._id || entry?.id || null;
            const isChecked = Boolean(selectedMap[key]);
            return (
              <ProductItemInSidebar
                key={key}
                item={inner}
                favoriteId={favId}
                selectable={true}
                checked={isChecked}
                hidePrice={true}
                onToggle={(val) =>
                  setSelectedMap((prev) => ({ ...prev, [key]: val }))
                }
              />
            );
          })
        ) : (
          <EmptySidebar title={titleSidebar.title} />
        )}
      </div>
      {hasItems && (
        <div className="space-y-3">
          {totalSelectedSaving > 0 && (
            <div className="text-sm text-red-600">
              Tiết kiệm khi chọn: {formatVND(totalSelectedSaving)}
            </div>
          )}
          <Button
            content={"ADD SELECTED TO CART"}
            w="w-full"
            hoverTextColor={"hover:text-white"}
            bgColor={"bg-transparent"}
            hoverBgColor={"hover:bg-black"}
            textColor={"text-black"}
            onClick={async () => {
              const selectedKeys = Object.keys(selectedMap).filter(
                (k) => selectedMap[k]
              );
              if (selectedKeys.length === 0) {
                toast.info("No items selected");
                return;
              }

              if (!userInfo) {
                toast.warning("Must be sign in!");
                setIsOpenSidebar(true);
                setTitleSidebar((prev) => ({
                  ...prev,
                  title: "Sign in",
                  key: "signin"
                }));
                return;
              }

              const customerCode =
                userInfo?.customerCode ||
                userInfo?.customer_id ||
                userInfo?._id ||
                userInfo?.id;

              const requests = normalized
                .filter((n) => selectedKeys.includes(String(n.key)))
                .map((n) => {
                  const product = n.inner;
                  const productCode =
                    product?.productCode || product?._id || product?.id;
                  const payload = { customerCode, productCode, quantity: 1 };
                  return cartService.createItem(payload);
                });

              try {
                await Promise.all(requests);
                toast.success("Added selected items to cart");
                setIsOnClickFunction((prev) => !prev);
                setIsOpenSidebar(true);
                setTitleSidebar((prev) => ({
                  ...prev,
                  title: "cart",
                  key: "cart"
                }));
                setSelectedMap({});
              } catch (err) {
                console.error(err);
                toast.error("Something went wrong while adding items to cart");
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default WishlistSidebar;
