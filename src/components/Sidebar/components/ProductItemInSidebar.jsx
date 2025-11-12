import { UserRound } from "lucide-react";
import React, { useContext } from "react";
import { IoMdClose } from "react-icons/io";
import { cartService } from "~/apis/cartService";
import { favoriteService } from "~/apis/favoriteService";
import { StoreContext } from "~/contexts/StoreProvider";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { buildImageUrl } from "~/lib/utils";
import { showConfirmToast } from "~/utils/showConfirmToast";

const ProductItemInSidebar = ({
  item,
  cartId = null,
  favoriteId = null,
  selectable = false,
  checked = false,
  onToggle = null,
  hidePrice = false
}) => {
  console.log(item);
  // support multiple incoming item shapes (old and new API)
  const {
    id,
    _id,
    productCode,
    productName,
    image,
    images,
    name,
    price,
    unitPrice,
    quantity: quantityFromItem,
    size = null,
    totalAmount
  } = item || {};

  // debug log removed

  const displayId = id || _id || productCode;
  const displayName = productName || name || item?.product || "Unknown";
  const displayImage =
    image || (Array.isArray(images) ? images[0] : null) || item?.image;
  const displayPrice = unitPrice ?? price ?? 0;
  const displayQuantity = quantityFromItem ?? item?.quantity ?? 1;
  // promotion-aware calculations (do not format here)
  const rawPrice = Number(displayPrice) || 0;
  let finalUnitPrice = rawPrice;
  let savedAmount = 0;
  let savedPercent = 0;
  // promotion value can come from several shapes: item.promotion.value, item.discountValue, item.discount?.value
  const promoValueRaw =
    item?.promotion?.value ??
    item?.discountValue ??
    item?.discount?.value ??
    item?.discountAmount ??
    null;
  if (promoValueRaw != null) {
    const v = Number(promoValueRaw);
    if (!Number.isNaN(v) && v > 0) {
      if (v <= 1) {
        savedPercent = Math.round(v * 100);
        finalUnitPrice = Math.round(rawPrice * (1 - v));
        savedAmount = rawPrice - finalUnitPrice;
      } else {
        savedAmount = v;
        finalUnitPrice = Math.max(0, rawPrice - savedAmount);
        savedPercent =
          rawPrice > 0 ? Math.round((savedAmount / rawPrice) * 100) : 0;
      }
    }
  }
  const displayTotal = totalAmount ?? finalUnitPrice * displayQuantity;
  const { toast } = useContext(ToastifyContext);
  const { setIsOnClickFunction, userInfo } = useContext(StoreContext);
  const { formatVND } = useStransferToVND();
  const handleDelete = () => {
    const data = {
      customerCode: userInfo.customerCode,
      productCode
    };
    showConfirmToast({
      message: "Are you sure delete this item?",
      onConfirm: () => {
        if (cartId) {
          cartService
            .deleteCart(data)
            .then(() => {
              toast.success("Delete successfully!");
              setIsOnClickFunction((prev) => !prev);
            })
            .catch();
        } else {
          favoriteService
            .deleteFavorite(data)
            .then(() => {
              toast.success("Delete successfully!");
              setIsOnClickFunction((prev) => !prev);
            })
            .catch();
        }
      }
    });
  };

  return (
    <>
      <div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="group relative flex items-center px-3 py-5 w-full hover:bg-gray-100 transition-colors duration-300"
      >
        {/* Hình ảnh */}
        <div className="w-1/3 flex items-center space-x-3">
          <div>
            {selectable && (
              <label className="inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only"
                  aria-checked={checked}
                  checked={Boolean(checked)}
                  onChange={() => onToggle && onToggle(!checked)}
                />
                <span
                  className={`w-5 h-5 inline-flex items-center justify-center rounded-md border transition-colors duration-150 ease-in-out ${
                    checked
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {checked && (
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
                  )}
                </span>
              </label>
            )}
          </div>
          <div className="relative">
            {(savedAmount > 0 || savedPercent > 0) && (
              <div className="absolute -top-2 -left-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                {savedAmount > 0
                  ? `-${formatVND(savedAmount)}`
                  : `-${savedPercent}%`}
              </div>
            )}
            <img
              className="w-[70px] h-[85px] object-cover"
              src={buildImageUrl(displayImage)}
              alt="Product"
            />
          </div>
        </div>

        {/* Thông tin */}
        <div className="w-2/3">
          <h2 className="text-xl max-w-[160px] truncate" title={displayName}>
            {displayName}
          </h2>
          <p>
            SKU:{" "}
            {productCode
              ? productCode.slice(-5)
              : String(displayId || "").slice(-5)}
          </p>

          {!hidePrice && (
            <div className="text-gray-600">
              <p>
                {cartId && (
                  <>
                    <span>{displayQuantity} x </span>
                  </>
                )}
                {savedAmount > 0 || savedPercent > 0 ? (
                  <>
                    <span className="font-semibold text-red-600">
                      {formatVND(finalUnitPrice)}
                    </span>
                    <span className="text-sm text-gray-400 line-through ml-2">
                      {formatVND(rawPrice)}
                    </span>
                  </>
                ) : (
                  <span>{formatVND(finalUnitPrice)}</span>
                )}
              </p>
              {(savedAmount > 0 || savedPercent > 0) && (
                <p className="text-xs text-red-600">
                  Tiết kiệm {formatVND(savedAmount)}{" "}
                  {savedPercent ? `(${savedPercent}%)` : null}
                </p>
              )}
              {/* per-item total (optional) */}
              {/* <p className="font-medium">{formatVND(displayTotal)}</p> */}
            </div>
          )}
        </div>

        {/* Nút X */}
        <button
          onClick={handleDelete}
          className="absolute top-5 right-5 text-xl text-gray-600 opacity-0 translate-x-3 pointer-events-none
            transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto"
        >
          <IoMdClose />
        </button>
      </div>
    </>
  );
};

export default ProductItemInSidebar;
