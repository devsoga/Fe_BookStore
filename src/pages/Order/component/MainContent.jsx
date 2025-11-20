import React, { useContext, useEffect, useState } from "react";
import { orderService } from "~/apis/orderService";
import Button from "~/components/Button/Button";
import { StoreContext } from "~/contexts/StoreProvider";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import OrderDetailModal from "./OrderDetailModal";
import { showConfirmToast } from "~/utils/showConfirmToast";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import {
  MdOutlineShoppingCart,
  MdSearch,
  MdFilterList,
  MdCalendarToday,
  MdLocalShipping,
  MdCheckCircle,
  MdCancel,
  MdPending,
  MdVisibility,
  MdClose
} from "react-icons/md";
import { useNavigate } from "react-router-dom";

const MainContent = () => {
  const [listOrder, setListOrder] = useState([]);
  console.log(listOrder);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useContext(ToastifyContext);
  const { userInfo } = useContext(StoreContext);
  const { formatVND } = useStransferToVND();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(false);
  const navigate = useNavigate();

  const getOrderStatus = (order) => {
    // Prefer explicit `orderStatus` from API when available
    const fromApi = (order?.orderStatus || "").toString().toLowerCase();

    const statusMap = {
      pending: {
        key: "pending",
        icon: MdPending,
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        label: "Chờ xử lý"
      },
      confirmed: {
        key: "confirmed",
        icon: MdLocalShipping,
        color: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Đã xác nhận"
      },
      preparing: {
        key: "preparing",
        icon: MdOutlineShoppingCart,
        color: "bg-purple-100 text-purple-700 border-purple-200",
        label: "Đang chuẩn bị"
      },
      shipping: {
        key: "shipping",
        icon: MdLocalShipping,
        color: "bg-orange-100 text-orange-700 border-orange-200",
        label: "Đang vận chuyển"
      },
      delivered: {
        key: "delivered",
        icon: MdCheckCircle,
        color: "bg-green-100 text-green-800 border-green-200",
        label: "Đã giao"
      },
      cancelled: {
        key: "cancelled",
        icon: MdCancel,
        color: "bg-red-100 text-red-800 border-red-200",
        label: "Đã hủy"
      },
      returned: {
        key: "returned",
        icon: MdCancel,
        color: "bg-gray-100 text-gray-800 border-gray-200",
        label: "Đã trả hàng"
      },
      unknown: {
        key: "unknown",
        icon: MdPending,
        color: "bg-gray-100 text-gray-800 border-gray-200",
        label: "Không xác định"
      }
    };

    if (fromApi && statusMap[fromApi]) {
      return statusMap[fromApi];
    }

    // Fallback to legacy heuristics if API field not present or unknown
    if (order.status === false && !order.isPaid) {
      return statusMap.pending;
    }
    if (
      order.status === true &&
      !order.isPaid &&
      order.paymentMethod === "Cash"
    ) {
      return statusMap.confirmed;
    }
    if (order.status === true && order.isPaid) {
      return statusMap.delivered;
    }

    return statusMap.unknown;
  };

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setOpen(true);
  };

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = listOrder;

    // Filter by search term (order ID or product name)
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.listProduct?.some((product) =>
            product.name?.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          order.details?.some((product) =>
            product.productName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => {
        const status = getOrderStatus(order);
        return status.key === statusFilter;
      });
    }

    setFilteredOrders(filtered);
  }, [listOrder, searchTerm, statusFilter]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
    setLoading(true);

    // Get orders by customer code from localStorage
    const customerCode = userInfo?.customerCode;
    if (!customerCode) {
      setLoading(false);
      setListOrder([]);
      return;
    }

    orderService
      .getOrdersByCustomer(customerCode)
      .then((res) => {
        console.log(res);
        const orders = res.data.data || [];
        setListOrder(orders);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching orders:", error);
        setListOrder([]);
        setLoading(false);
      });
  }, [reload, userInfo]);

  const handleCancelOrder = (orderCode) => {
    showConfirmToast({
      message: "Bạn có chắc chắn muốn hủy đơn hàng này?",
      onConfirm: () => {
        orderService
          .deleteOrder(orderCode)
          .then((res) => {
            toast.success("Hủy đơn hàng thành công");
            setReload((prev) => !prev);
          })
          .catch((error) => {
            toast.error("Không thể hủy đơn hàng. Vui lòng thử lại.");
          });
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Đơn hàng của tôi
          </h1>
          <p className="text-gray-600">
            Theo dõi và quản lý tất cả đơn hàng của bạn
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã đơn hàng hoặc tên sản phẩm..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <MdFilterList className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
              <select
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[180px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Hiển thị {filteredOrders.length} trong tổng số {listOrder.length}{" "}
              đơn hàng
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <MdClose className="text-lg" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Order Cards */}
        {filteredOrders?.length > 0 ? (
          <div className="space-y-6">
            {[...filteredOrders].reverse().map((order, index) => {
              const statusInfo = getOrderStatus(order);
              const StatusIcon = statusInfo.icon;

              // Compute totals and discounts according to API shape
              const totalAmountNum = Number(order.totalAmount) || 0;
              const promotionDiscountNum = order.promotionCustomerValue
                ? order.promotionCustomerValue < 1
                  ? totalAmountNum * Number(order.promotionCustomerValue)
                  : Number(order.promotionCustomerValue)
                : 0;
              const couponDiscountNum = order.couponDiscountValue
                ? order.couponDiscountValue < 1
                  ? (totalAmountNum - promotionDiscountNum) *
                    Number(order.couponDiscountValue)
                  : Number(order.couponDiscountValue)
                : 0;
              const otherDiscountNum = Number(order.discount) || 0;
              const computedFinal =
                Number(order.finalAmount) ||
                totalAmountNum -
                  promotionDiscountNum -
                  couponDiscountNum -
                  otherDiscountNum;

              // collect up to 3 thumbnails for quick preview
              const thumbnails = (order.details || order.items || [])
                .slice(0, 3)
                .map((d) => d.image || d.thumbnail)
                .filter(Boolean);

              // product-level discounts (per item)
              const productDiscounts = (order.details || order.items || [])
                .map((d) => {
                  const qty = Number(d.quantity) || 1;
                  const unit = Number(d.unitPrice) || 0;
                  const total = Number(d.totalAmount) || unit * qty;
                  const final = Number(d.finalPrice) || 0;
                  const discountAmt = Math.max(0, total - final);
                  return {
                    code: d.productCode,
                    name: d.productName,
                    discountAmt,
                    discountValue: Number(d.discountValue) || 0
                  };
                })
                .filter((d) => d.discountAmt > 0);

              return (
                <div
                  key={order._id || index}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            #{order.orderCode || order._id}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <MdCalendarToday className="text-gray-400 text-sm" />
                            <span className="text-sm text-gray-600">
                              {new Date(
                                order.orderDate || order.createAt || Date.now()
                              ).toLocaleDateString("vi-VN", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusInfo.color}`}
                        >
                          <StatusIcon className="text-lg" />
                          {statusInfo.label}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-600">Tổng tiền</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatVND(
                            order.finalAmount ||
                              order.totalPriceOrder ||
                              order.totalAmount
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-6">
                    {/* Products are shown in the detail modal; preview removed */}

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-600">
                            <div>
                              Giá gốc:{" "}
                              <span className="font-medium text-gray-900 ml-2">
                                {formatVND(totalAmountNum)}
                              </span>
                            </div>
                            {order.promotionCustomerCode && (
                              <div className="text-xs text-gray-500">
                                KM: {order.promotionCustomerCode}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Tổng cộng</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatVND(computedFinal)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {promotionDiscountNum > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>
                              Giảm giá KH{" "}
                              {order.promotionCustomerValue < 1
                                ? `(${Math.round(
                                    order.promotionCustomerValue * 100
                                  )}%)`
                                : ""}
                            </span>
                            <span>-{formatVND(promotionDiscountNum)}</span>
                          </div>
                        )}
                        {couponDiscountNum > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>
                              Giảm giá coupon{" "}
                              {order.couponCode ? `(${order.couponCode})` : ""}
                            </span>
                            <span>-{formatVND(couponDiscountNum)}</span>
                          </div>
                        )}
                        {otherDiscountNum > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Giảm giá khác</span>
                            <span>-{formatVND(otherDiscountNum)}</span>
                          </div>
                        )}
                        {productDiscounts.length > 0 && (
                          <div className="mt-2 border-t pt-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              Giảm giá sản phẩm
                            </div>
                            {productDiscounts.map((pd) => (
                              <div
                                key={pd.code}
                                className="flex justify-between text-red-600 text-sm"
                              >
                                <span className="truncate max-w-[180px]">
                                  {pd.name || pd.code}
                                </span>
                                <span>-{formatVND(pd.discountAmt)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                      <div>
                        <p className="text-gray-600">Phương thức thanh toán</p>
                        <p className="font-medium text-gray-900">
                          {order.paymentMethod === "Cash"
                            ? "Thanh toán khi nhận hàng"
                            : order.paymentMethod === "QR"
                            ? "Chuyển khoản QR"
                            : order.paymentMethod === "VNPAY"
                            ? "Thanh toán VNPAY"
                            : "Khác"}
                        </p>
                        <p
                          className={`text-xs ${
                            order.isPaid ? "text-green-600" : "text-orange-600"
                          }`}
                        >
                          {order.isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Địa chỉ giao hàng</p>
                        <p className="font-medium text-gray-900">
                          {order.address || "Chưa cập nhật"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Số điện thoại</p>
                        <p className="font-medium text-gray-900">
                          {order.phoneNumber || "Chưa cập nhật"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleViewDetail(order)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <MdVisibility className="text-lg" />
                        Xem chi tiết
                      </button>

                      {
                        // Only allow cancel for orders with status 'pending'
                      }
                      <button
                        onClick={() =>
                          statusInfo.key === "pending" &&
                          handleCancelOrder(order.orderCode || order._id)
                        }
                        disabled={statusInfo.key !== "pending"}
                        title={
                          statusInfo.key === "pending"
                            ? "Hủy đơn hàng"
                            : "Chỉ đơn trạng thái 'Chờ xử lý' mới có thể hủy"
                        }
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          statusInfo.key === "pending"
                            ? "border border-red-300 text-red-600 hover:bg-red-50"
                            : "border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <MdCancel className="text-lg" />
                        Hủy đơn hàng
                      </button>

                      {statusInfo.key === "delivered" && (
                        <button
                          onClick={() => handleViewDetail(order)}
                          className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <MdCheckCircle className="text-lg" />
                          Đánh giá
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : listOrder.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm p-12">
              <MdOutlineShoppingCart className="text-8xl text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Chưa có đơn hàng nào
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Bạn chưa có đơn hàng nào. Hãy khám phá các sản phẩm tuyệt vời
                của chúng tôi và đặt hàng ngay!
              </p>
              <button
                onClick={() => navigate("/shop")}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Mua sắm ngay
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm p-12">
              <MdSearch className="text-8xl text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Không tìm thấy đơn hàng
              </h3>
              <p className="text-gray-600 mb-8">
                Không có đơn hàng nào phù hợp với tiêu chí tìm kiếm của bạn.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal chi tiết */}
      <OrderDetailModal
        isOpen={open}
        onClose={() => setOpen(false)}
        order={selectedOrder}
      />
    </div>
  );
};

export default MainContent;
