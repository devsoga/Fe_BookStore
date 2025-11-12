import React from "react";
import {
  FaEdit,
  FaTrash,
  FaTag,
  FaBook,
  FaShoppingCart,
  FaStar,
  FaTimes
} from "react-icons/fa";

const ProductCard = ({
  product,
  onEdit,
  onDelete,
  onAddPromotion,
  onRemovePromotion,
  promotions,
  normalizeImage,
  formatCurrency
}) => {
  // compute discounted price using promotion.value (prefer promotions list)
  const originalPrice = Number(product?.price || 0);
  const promotionObj =
    promotions?.find((p) => p.promotionCode === product?.promotionCode) || null;
  const promoValue = promotionObj?.value ?? product?.discountValue ?? null;
  const promoName =
    promotionObj?.promotionName ?? product?.promotionName ?? null;
  let discountedPrice = null;
  let discountLabel = null;
  if (product?.promotionCode && promoValue != null) {
    const v = Number(promoValue);
    if (!Number.isNaN(v)) {
      if (v <= 1) {
        discountedPrice = Math.round(originalPrice * (1 - v));
        discountLabel = `${(v * 100).toFixed(0)}%`;
      } else {
        discountedPrice = Math.max(0, originalPrice - v);
        discountLabel = `${formatCurrency(v)}đ`;
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden group">
      <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden">
        {product.image ? (
          <img
            src={normalizeImage(product.image)}
            alt={product.productName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = "/placeholder-book.jpg";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <FaBook className="text-gray-400 text-4xl" />
          </div>
        )}

        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            onClick={() => onEdit && onEdit(product)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
            title="Chỉnh sửa"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => onDelete && onDelete(product.productCode)}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
            title="Xóa"
          >
            <FaTrash size={16} />
          </button>

          {/* Promotion actions */}
          <button
            onClick={() => onAddPromotion && onAddPromotion(product)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full transition-colors"
            title="Thêm/Áp dụng khuyến mãi"
          >
            <FaTag size={16} />
          </button>

          {product?.promotionCode && (
            <button
              onClick={() => onRemovePromotion && onRemovePromotion(product)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full transition-colors"
              title="Xóa khuyến mãi"
            >
              <FaTimes size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaTag className="text-gray-400 text-xs" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {product.categoryName || "Chưa phân loại"}
          </span>
        </div>

        <h3 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2 leading-tight">
          {product.productName}
        </h3>

        <div className="mb-2">
          {product.author && (
            <p className="text-xs text-gray-600">{product.author}</p>
          )}
          {product.publisher && (
            <p className="text-xs text-gray-400">
              Nhà xuất bản: {product.publisher}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          {(() => {
            const original = originalPrice;
            const discounted = discountedPrice;
            return (
              <>
                <div>
                  {discounted != null ? (
                    <>
                      <div className="text-sm text-gray-400 line-through">
                        {formatCurrency(original)}đ
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(discounted)}đ
                      </div>
                    </>
                  ) : (
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(original)}đ
                    </div>
                  )}
                </div>

                {discounted != null && (
                  <div className="inline-flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                      <FaTag className="text-yellow-700" />
                      <span>{discountLabel}</span>
                    </span>
                    {promoName && (
                      <span className="text-xs text-gray-500">{promoName}</span>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <FaShoppingCart className="text-gray-400" />
            <span
              className={`px-2 py-1 rounded-full ${
                (product.stockQuantity || 0) > 0
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {product.stockQuantity || 0} tồn kho
            </span>
          </div>

          {product.rating ? (
            <div className="flex items-center gap-1">
              <FaStar className="text-yellow-400" />
              <span className="text-gray-600">
                {product.rating} ({product.reviewCount || 0})
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Mã: {product.productCode}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
