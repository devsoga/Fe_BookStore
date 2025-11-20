import React, { useEffect, useState, useRef } from "react";
import {
  FaSearch,
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaTrash,
  FaPrint,
  FaCreditCard,
  FaMoneyBillWave,
  FaUser,
  FaTachometerAlt,
  FaBarcode,
  FaCalculator,
  FaSyncAlt,
  FaTimes,
  FaCheck,
  FaTag,
  FaFilter,
  FaUsers,
  FaReceipt,
  FaGift,
  FaQrcode,
  FaDownload
} from "react-icons/fa";
import { BsBank } from "react-icons/bs";
import { IoCopy } from "react-icons/io5";
import Modal from "../../../components/Admin/Modal";
import { useNavigate } from "react-router-dom";
import { productService } from "../../../apis/productService";
import promotionService from "../../../apis/promotionService";
import { orderService } from "../../../apis/orderService";
import { sepayService } from "../../../apis/sepayService";
import InvoiceModal from "../../../components/InvoiceModal/InvoiceModal";
import QrPaymentCountdown from "../../Cart/component/Content/QrPaymentCountdown";
import { useCopyText } from "../../../hooks/useCopyText";
import { buildImageUrl } from "../../../lib/utils";

import axiosClient from "../../../apis/axiosClient";
import POSInvoice from "../../../components/POSInvoice/POSInvoice";
import { toast } from "react-toastify";

// POSPage layout: centered container with inner scrolling

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showPromotionsOnly, setShowPromotionsOnly] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  console.log(lastOrder);
  const [activeSection, setActiveSection] = useState("cart"); // 'cart', 'customer', 'discount', 'payment'
  const [showInvoiceInline, setShowInvoiceInline] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("percent"); // percent or fixed
  const [lookupPhone, setLookupPhone] = useState("");
  const [memberInfo, setMemberInfo] = useState(null); // {name, role, points}

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);

  // Sepay QR states
  const [sepayOrderCode, setSepayOrderCode] = useState(null);
  const [sepayActive, setSepayActive] = useState(false);
  const pollingRef = useRef(null);
  const POLL_INTERVAL = 3000;
  const MAX_POLLING_TIME = 5 * 60 * 1000;
  const { handleCopy } = useCopyText();

  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
    loadPromotions();
  }, []);

  // Sepay polling effect for QR payments
  useEffect(() => {
    if (!sepayActive || !sepayOrderCode) return;

    let startTime = Date.now();

    const checkTransfers = async () => {
      try {
        if (Date.now() - startTime > MAX_POLLING_TIME) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          try {
            localStorage.removeItem("countdownEndTime");
          } catch (e) {}
          setSepayActive(false);
          setShowQRModal(false);
          toast.warn("Payment time expired");
          return;
        }

        const res = await sepayService.getTransfersByOrder(sepayOrderCode);
        const payload = res?.data?.data;
        const successDetected =
          payload != null &&
          (Array.isArray(payload) ? payload.length > 0 : true);
        if (successDetected) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          try {
            localStorage.removeItem("countdownEndTime");
          } catch (e) {}
          setSepayActive(false);
          setShowQRModal(false);
          // fetch order details from server and update lastOrder so InvoiceModal shows real data
          try {
            const orderResp = await orderService.getOrderByCode(sepayOrderCode);
            const serverData =
              orderResp?.data?.data || orderResp?.data || orderResp;
            if (serverData) {
              setLastOrder(serverData);
              // persist recent order for other components
              try {
                const recent = {
                  orderCode:
                    serverData.orderCode || serverData.code || serverData.id,
                  finalAmount:
                    serverData.finalAmount ||
                    serverData.totalAmount ||
                    calculateTotal(),
                  total: serverData.totalAmount || calculateSubtotal()
                };
              } catch (e) {}
            }
          } catch (e) {
            // fallback: keep existing lastOrder
            console.warn("Failed to fetch order after payment", e);
          }
          setShowInvoice(true);
          clearCart();
          // Clear customer / member-related UI state so previous customer info
          // doesn't remain visible in the POS payment area after successful payment.
          try {
            setCustomer({ name: "", phone: "", email: "", address: "" });
            setMemberInfo(null);
            setLookupPhone("");
            setReceivedAmount("");
            setPaymentMethod("cash");
          } catch (e) {}
          toast.success("Payment detected. Thank you!");
        }
      } catch (err) {
        // ignore transient errors and continue polling
      }
    };

    // initial check then interval
    checkTransfers();
    pollingRef.current = setInterval(checkTransfers, POLL_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [sepayActive, sepayOrderCode]);

  const loadProducts = async () => {
    try {
      const resp = await productService.getAllProduct();
      let data = [];
      if (!resp) data = [];
      else if (Array.isArray(resp.data)) data = resp.data;
      else if (resp.data && Array.isArray(resp.data.data))
        data = resp.data.data;
      else if (resp.data && Array.isArray(resp.data.items))
        data = resp.data.items;
      else data = Array.isArray(resp.data) ? resp.data : [];
      setProducts(data);

      const cats = [];
      (data || []).forEach((p) => {
        if (
          p &&
          p.categoryCode &&
          !cats.find((c) => c.categoryCode === p.categoryCode)
        ) {
          cats.push({
            categoryCode: p.categoryCode,
            categoryName: p.categoryName || ""
          });
        }
      });
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPromotions = async () => {
    try {
      const res = await promotionService.getAllPromotions();
      const data = res?.data?.data || [];
      const active = data.filter(
        (p) => p.status && (!p.endDate || new Date(p.endDate) > new Date())
      );
      setPromotions(active);
    } catch (e) {
      console.error(e);
    }
  };

  const formatCurrency = (v) => Number(v || 0).toLocaleString("vi-VN");

  const normalizeImage = (img) => {
    if (!img) return null;
    if (typeof img !== "string") return img;
    if (img.startsWith("blob:") || img.startsWith("data:")) return img;
    return buildImageUrl(img);
  };

  const getDiscountedPrice = (product) => {
    const original = Number(product?.price || 0);
    const promotion = promotions.find(
      (p) => p.promotionCode === product?.promotionCode
    );
    const promoValue = promotion?.value ?? product?.discountValue ?? null;
    if (!promoValue) return original;
    const v = Number(promoValue);
    if (Number.isNaN(v)) return original;
    if (v <= 1) return Math.round(original * (1 - v));
    return Math.max(0, original - v);
  };

  const addToCart = (product) => {
    const found = cart.find((c) => c.productCode === product.productCode);
    if (found)
      setCart(
        cart.map((c) =>
          c.productCode === product.productCode
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      );
    else setCart([...cart, { ...product, quantity: 1 }]);
  };

  const handleCheckout = async (selectedPaymentMethod) => {
    const method = selectedPaymentMethod || paymentMethod;
    if (cart.length === 0) return toast.error("Giỏ hàng trống!");
    if (method === "cash" && getChange() < 0)
      return toast.error("Số tiền nhận không đủ!");

    setIsProcessing(true);
    try {
      // determine customerCode: prefer memberInfo, else try lookup by entered phone, else KH_DEMO
      let customerCode = memberInfo?.customerCode || "KH_DEMO";
      if (!memberInfo && customer?.phone) {
        try {
          const resp = await axiosClient.get(
            `/account/phone/${customer.phone}`
          );
          const d = resp?.data?.data || resp?.data;
          if (d) {
            customerCode =
              d.customerCode ||
              d.customer?.customerCode ||
              d.code ||
              customerCode;
          }
        } catch (err) {
          // ignore lookup errors and fall back to default
          console.warn("Customer lookup during checkout failed:", err);
        }
      }

      // Format order data according to API specification
      // generate client order code to pass to server and use as fallback for QR/invoice
      const clientOrderCode = `ORD_${Date.now()}`;
      const orderData = {
        customerCode: customerCode,
        employeeCode: "NV_MPOS1", // Default employee code for POS
        promotionCustomerCode: memberInfo?.promotion_code || null,
        promotionCustomerValue: memberInfo?.memberDiscount || null,
        couponCode: null, // Not used in POS
        couponDiscountValue: null, // Not used in POS
        orderType: "Offline", // POS orders are offline
        paymentMethod:
          method === "cash" ? "Cash" : method === "qr" ? "QR" : "Card",
        discount: calculateDiscount(), // Additional discount after product promotions and member discount
        note: customer.address ? "Giao hàng tại: " + customer.address : null,
        address: customer.address || null,
        phoneNumber: customer.phone || null,
        details: cart.map((item) => {
          const detail = {
            productCode: item.productCode,
            quantity: item.quantity
          };
          // Add promotionCode if product has promotion
          if (item.promotionCode) {
            detail.promotionCode = item.promotionCode;
          }
          return detail;
        })
      };

      const resp = await orderService.createOrder(orderData);
      if (resp && (resp.data || resp.id || resp.orderCode)) {
        // Use server response data for order details
        const serverData = resp.data.data || resp;
        const newOrder = {
          // Use server response data first, fallback to local data
          customerName: serverData.customerName || customer.name || "Khách lẻ",
          customerPhone: serverData.phoneNumber || customer.phone || "",
          customerEmail: serverData.customerEmail || customer.email || "",
          customerAddress: serverData.address || customer.address || "",
          paymentMethod: serverData.paymentMethod || method,
          orderDate: serverData.orderDate || new Date().toISOString(),
          orderStatus: serverData.orderStatus || "completed",
          isPaid: serverData.isPaid || false,
          // Use server's calculated amounts
          totalAmount: serverData.totalAmount || calculateSubtotal(),
          finalAmount: serverData.finalAmount || calculateTotal(),
          discount: serverData.discount || calculateDiscount(),
          // Promotion and coupon info from server
          promotionCustomerCode: serverData.promotionCustomerCode,
          promotionCustomerValue: serverData.promotionCustomerValue,
          couponCode: serverData.couponCode,
          couponDiscountValue: serverData.couponDiscountValue,
          // Employee info
          employeeCode: serverData.employeeCode,
          employeeName: serverData.employeeName,
          // Order details with server calculations
          items: (serverData.details || []).map((detail) => ({
            orderDetailCode: detail.orderDetailCode,
            productCode: detail.productCode,
            productName: detail.productName,
            image: detail.image,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            totalAmount: detail.totalAmount,
            promotionCode: detail.promotionCode,
            discountValue: detail.discountValue,
            finalPrice: detail.finalPrice
          })),
          // POS specific fields
          receivedAmount:
            method === "cash"
              ? Number(receivedAmount)
              : serverData.finalAmount || calculateTotal(),
          change: method === "cash" ? getChange() : 0,
          status: "completed",
          id: serverData.id || resp.id || Date.now(),
          orderCode: serverData.orderCode || resp.orderCode || clientOrderCode
        };

        setLastOrder(newOrder);
        // Persist a recent order summary to localStorage so OrderSuccess/OrderPayment can read it
        try {
          const recent = {
            orderCode: newOrder.orderCode,
            finalAmount:
              newOrder.finalAmount || newOrder.total || calculateTotal(),
            total: newOrder.total
          };
          localStorage.setItem("recentOrder", JSON.stringify(recent));
          localStorage.setItem("orderCode", newOrder.orderCode);
        } catch (e) {
          // ignore storage errors
        }

        // Handle different payment methods
        if (method === "qr") {
          const serverData = resp.data || resp;
          const orderCode =
            serverData.orderCode || resp.orderCode || newOrder.orderCode;
          setSepayOrderCode(orderCode);
          setSepayActive(true);
          setShowQRModal(true);
          // Don't clear cart yet - wait for payment confirmation
        } else {
          // For cash and other methods, show invoice immediately
          setShowInvoice(true);
          clearCart();
        }
        setCustomer({ name: "", phone: "", email: "", address: "" });
        setReceivedAmount("");
        setDiscount(0);
        setActiveSection("cart");
        toast.success("Thanh toán thành công!");
      } else {
        throw new Error("Invalid response");
      }
    } catch (e) {
      console.error(e);
      toast.error("Có lỗi xảy ra khi thanh toán!");
    } finally {
      setIsProcessing(false);
    }
  };

  const lookupCustomer = async (q) => {
    if (!q) {
      setMemberInfo(null);
      return;
    }
    const phone = (q || "").toString().trim();
    try {
      // Try API lookup first
      const resp = await axiosClient.get(`/account/phone/${phone}`);
      const d = resp?.data?.data || resp?.data;
      if (d) {
        const md = Number(d.memberDiscount ?? d.memberDiscount ?? 0) || 0;
        const points = Math.floor(Number(d.points ?? 0));
        const role =
          d.customerTypeName ||
          d.roleCode ||
          d.customerTypeCode ||
          d.role ||
          "";
        setMemberInfo({
          name: d.customerName || d.username || "",
          role,
          points,
          memberDiscount: md,
          promotion_code: d.promotion_code || d.promotionCode || null,
          customerCode: d.customerCode || d.code || null
        });
        setCustomer({
          name: d.customerName || d.username || "",
          phone: d.phone || phone,
          email: d.email || "",
          address: d.address || d.customerAddress || ""
        });
        // NOTE: Do not auto-apply member discount to the invoice-level discount control.
        // Member discount is shown in the summary and treated separately; the "Giảm giá"
        // panel applies an additional invoice-level discount last (after product and member promos).
        return;
      }
    } catch (err) {
      console.warn("Customer lookup API failed, falling back to mock", err);
    }

    // Fallback to mock data if API not available
    const found = (Array.isArray(mockCustomers) ? mockCustomers : []).find(
      (c) => c.phone === phone || c.email === phone
    );
    if (found) {
      const points = Math.floor((found.total_spent || 0) / 1000);
      setMemberInfo({
        name: found.ho_ten || "",
        role: found.role || "regular",
        points,
        memberDiscount: 0,
        promotion_code: null
      });
      setCustomer({
        name: found.ho_ten || "",
        phone: found.phone || "",
        email: found.email || "",
        address: found.dia_chi || ""
      });
    } else {
      setMemberInfo(null);
    }
  };

  // Helper calculations and cart operations
  function calculateSubtotal() {
    return (cart || []).reduce((s, it) => {
      const price = getDiscountedPrice(it);
      const qty = Number(it.quantity || 0);
      return s + price * qty;
    }, 0);
  }

  // Original subtotal without any product-level promotions
  function calculateOriginalSubtotal() {
    return (cart || []).reduce((s, it) => {
      const original = Number(it.price || it.originalPrice || 0);
      const qty = Number(it.quantity || 0);
      return s + original * qty;
    }, 0);
  }

  // Total amount reduced by product-level promotions (original - discounted)
  function calculatePromotionDiscount() {
    const orig = calculateOriginalSubtotal();
    const discounted = calculateSubtotal();
    return Math.max(0, orig - discounted);
  }

  function calculateDiscount() {
    // Calculate additional discount applied AFTER product promotions and
    // AFTER member discount. Member discount is handled separately and
    // applied before this additional discount.
    const subtotalAfterPromos = calculateSubtotal();
    const memberRateRaw = memberInfo?.memberDiscount ?? 0;
    const memberRate =
      Number(memberRateRaw) > 1
        ? Number(memberRateRaw) / 100
        : Number(memberRateRaw);
    const memberDisc = Math.max(
      0,
      Math.min(subtotalAfterPromos, subtotalAfterPromos * (memberRate || 0))
    );
    const base = Math.max(0, subtotalAfterPromos - memberDisc);
    if (!discount || discount <= 0) return 0;
    if (discountType === "percent") {
      return Math.round(Math.min(base, (base * Number(discount)) / 100));
    }
    return Math.round(Math.min(base, Number(discount)));
  }

  function calculateTotal() {
    // Final total should apply discounts in this order:
    // 1. Product-level promotions (already in calculateSubtotal())
    // 2. Member discount (applied next)
    // 3. Other inline discounts from discount section (applied after member discount)
    const discountedSubtotal = calculateSubtotal();
    const memberRateRaw = memberInfo?.memberDiscount ?? 0;
    const memberRate =
      Number(memberRateRaw) > 1
        ? Number(memberRateRaw) / 100
        : Number(memberRateRaw);
    const memberDisc = Math.round(
      Math.max(0, discountedSubtotal * (memberRate || 0))
    );
    const afterMember = Math.max(0, discountedSubtotal - memberDisc);
    const otherInline = Math.round(calculateDiscount());
    return Math.max(0, Math.round(afterMember - otherInline));
  }

  function getChange() {
    const paid = Number(receivedAmount || 0);
    return paid - calculateTotal();
  }

  function removeFromCart(productCode) {
    setCart((c) => (c || []).filter((it) => it.productCode !== productCode));
  }

  function updateQuantity(productCode, qty) {
    setCart((c) => {
      const list = Array.isArray(c) ? [...c] : [];
      return list
        .map((it) =>
          it.productCode === productCode ? { ...it, quantity: Number(qty) } : it
        )
        .filter((it) => Number(it.quantity || 0) > 0);
    });
  }

  function clearCart() {
    setCart([]);
  }

  function confirmClearAll() {
    // reset cart and related customer/discount/payment states
    clearCart();
    setCustomer({ name: "", phone: "", email: "", address: "" });
    setLookupPhone("");
    setMemberInfo(null);
    setDiscount(0);
    setDiscountType("percent");
    setReceivedAmount("");
    setActiveSection("cart");
    setShowInvoice(false);
    setShowInvoiceInline(false);
    setShowClearConfirm(false);
    toast.info("Đã xóa toàn bộ giỏ hàng và thông tin khách hàng");
  }

  const filteredProducts = (products || []).filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (p.productName || "").toLowerCase().includes(q) ||
      (p.productCode || "").toLowerCase().includes(q);
    const matchesCategory =
      !selectedCategory || p.categoryCode === selectedCategory;
    // show all products regardless of stock
    const matchesPromotion = !showPromotionsOnly || Boolean(p.promotionCode);
    return matchesSearch && matchesCategory && matchesPromotion;
  });

  // Breakdown values for order summary: original subtotal, product-level promotions,
  // member/customer discount (if any) and other inline discounts.
  const originalSubtotal = calculateOriginalSubtotal();
  const productPromotionDiscount = calculatePromotionDiscount();
  const memberRateRaw = memberInfo?.memberDiscount ?? 0;
  const memberRate =
    Number(memberRateRaw) > 1
      ? Number(memberRateRaw) / 100
      : Number(memberRateRaw);
  const memberDiscountAmount = Math.max(
    0,
    Math.round(
      Math.min(calculateSubtotal(), calculateSubtotal() * (memberRate || 0))
    )
  );
  const totalInlineDiscount = calculateDiscount();
  const otherInlineDiscount = Math.max(0, totalInlineDiscount);

  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <FaTachometerAlt />
                <span>Dashboard</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                  <FaShoppingCart className="text-white" />
                </div>
                Bán hàng POS
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500">Nhân viên</div>
                <div className="font-medium">Admin User</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <FaUser className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[calc(100vh-88px)] ">
        <div className="w-full p-4 h-full">
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Sidebar */}
            <div className="col-span-3 overflow-scroll">
              <div className="bg-white rounded-xl shadow-sm border h-full flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FaFilter className="text-gray-600" />
                    Bộ lọc sản phẩm
                  </h3>
                </div>

                <div className="p-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Danh mục
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSelectedCategory("");
                            setShowPromotionsOnly(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                            selectedCategory === "" && !showPromotionsOnly
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          📚 Tất cả sản phẩm
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.categoryCode}
                            onClick={() => {
                              setSelectedCategory(cat.categoryCode);
                              setShowPromotionsOnly(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                              selectedCategory === cat.categoryCode
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                            }`}
                          >
                            📖 {cat.categoryName || cat.categoryCode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Bộ lọc đặc biệt
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowPromotionsOnly((s) => !s)}
                          className={`w-full px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                            showPromotionsOnly
                              ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                              : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <FaGift />
                            Khuyến mãi
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              showPromotionsOnly
                                ? "bg-yellow-200"
                                : "bg-gray-200"
                            }`}
                          >
                            {showPromotionsOnly ? "ON" : "OFF"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Thao tác nhanh
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory("");
                            setShowPromotionsOnly(false);
                          }}
                          className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <FaTimes />
                          Xóa bộ lọc
                        </button>
                        <button
                          onClick={() => loadProducts()}
                          className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                        >
                          <FaSyncAlt />
                          Làm mới
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Area */}
            <div className="col-span-6 overflow-scroll">
              <div className="bg-white rounded-xl shadow-sm border h-full flex flex-col overflow-hidden">
                {/* Search Bar */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b flex-shrink-0">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="🔍 Tìm kiếm sản phẩm theo tên hoặc mã..."
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map((cat) => (
                        <option key={cat.categoryCode} value={cat.categoryCode}>
                          {cat.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Products Grid */}
                <div className="p-4 flex-1 overflow-y-auto overscroll-contain min-h-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map((product) => {
                      const originalPrice = Number(product?.price || 0);
                      const discountedPrice = getDiscountedPrice(product);
                      const hasPromotion =
                        product?.promotionCode &&
                        discountedPrice < originalPrice;
                      const isLowStock =
                        (product.stock || product.stockQuantity || 0) < 10;

                      return (
                        <div
                          key={product.productCode}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group relative h-full flex flex-col"
                          onClick={() => addToCart(product)}
                        >
                          {/* Promotion Badge */}
                          {hasPromotion && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full z-10">
                              <FaTag className="inline mr-1" />
                              KM
                            </div>
                          )}

                          {/* Product Image */}
                          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-3 overflow-hidden relative flex-shrink-0">
                            {product.image ? (
                              <img
                                src={normalizeImage(product.image)}
                                alt={product.productName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  e.target.src = "/placeholder-book.jpg";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <FaBarcode size={28} />
                              </div>
                            )}

                            {/* Stock Badge */}
                            {isLowStock && (
                              <div className="absolute bottom-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                                Sắp hết
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
                            <h3
                              title={product.productName}
                              className="font-semibold text-sm text-gray-900 leading-tight"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }}
                            >
                              {product.productName}
                            </h3>

                            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                              📦 {product.productCode}
                            </div>

                            {/* Price */}
                            <div className="space-y-1">
                              {hasPromotion ? (
                                <>
                                  <div className="text-xs text-gray-400 line-through">
                                    {formatCurrency(originalPrice)}đ
                                  </div>
                                  <div className="text-lg font-bold text-red-600">
                                    {formatCurrency(discountedPrice)}đ
                                  </div>
                                </>
                              ) : (
                                <div className="text-lg font-bold text-blue-600">
                                  {formatCurrency(originalPrice)}đ
                                </div>
                              )}
                            </div>

                            {/* Stock */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500">Tồn kho:</span>
                              <span
                                className={`font-medium px-2 py-1 rounded ${
                                  isLowStock
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {product.stock || product.stockQuantity || 0}
                              </span>
                            </div>

                            {/* Add Button */}
                            <button className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 group-hover:scale-105 flex-shrink-0">
                              <FaPlus size={12} />
                              Thêm vào giỏ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <FaBarcode className="text-3xl text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-2">
                        Không tìm thấy sản phẩm
                      </h3>
                      <p className="text-sm">
                        Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cart/Checkout Area */}
            <div className="col-span-3 overflow-scroll">
              <div className="bg-white rounded-xl shadow-sm border h-full flex flex-col overflow-hidden">
                {/* Section Header */}
                <div
                  className={`text-white p-4 ${
                    activeSection === "cart"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600"
                      : activeSection === "customer"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700"
                      : activeSection === "discount"
                      ? "bg-gradient-to-r from-purple-600 to-purple-700"
                      : "bg-gradient-to-r from-orange-600 to-orange-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      {activeSection === "cart" && (
                        <>
                          <FaShoppingCart /> Giỏ hàng
                        </>
                      )}
                      {activeSection === "customer" && (
                        <>
                          <FaUser /> Thông tin khách hàng
                        </>
                      )}
                      {activeSection === "discount" && (
                        <>
                          <FaGift /> Giảm giá
                        </>
                      )}
                      {activeSection === "payment" && (
                        <>
                          <FaCalculator /> Thanh toán
                        </>
                      )}
                    </h2>
                    {activeSection === "cart" && (
                      <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                        {cart.length} sản phẩm
                      </div>
                    )}
                    {activeSection !== "cart" && (
                      <button
                        onClick={() => setActiveSection("cart")}
                        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <FaTimes size={12} />
                        Đóng
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  {/* Cart Section */}
                  {activeSection === "cart" && (
                    <>
                      {/* Customer lookup + member info */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-500">
                          Tìm khách hàng (SĐT hoặc email)
                        </label>
                        <div className="flex gap-2 mt-2">
                          <input
                            value={lookupPhone}
                            onChange={(e) => setLookupPhone(e.target.value)}
                            placeholder="0901234567 hoặc email@example.com"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                          />
                          <button
                            onClick={() => lookupCustomer(lookupPhone)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                          >
                            Tìm
                          </button>
                        </div>
                        {memberInfo ? (
                          <div className="mt-2 text-sm text-gray-700">
                            <div>
                              <strong>{memberInfo.name}</strong>
                            </div>
                            <div>
                              Hạng:{" "}
                              <span className="font-medium">
                                {memberInfo.role}
                              </span>
                            </div>
                            <div>
                              Điểm tích lũy:{" "}
                              <span className="font-medium">
                                {memberInfo.points}
                              </span>
                            </div>
                            {memberInfo.promotion_code && (
                              <div>
                                Mã KM:{" "}
                                <span className="font-medium">
                                  {memberInfo.promotion_code}
                                </span>
                              </div>
                            )}
                            {memberInfo.memberDiscount ? (
                              <div>
                                Chiết khấu thành viên:{" "}
                                <span className="font-medium">
                                  {(memberInfo.memberDiscount * 100).toFixed(2)}
                                  %
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          lookupPhone && (
                            <div className="mt-2 text-sm text-gray-500">
                              Không tìm thấy khách hàng
                            </div>
                          )
                        )}
                      </div>
                      {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FaShoppingCart className="mx-auto text-4xl mb-2 opacity-50" />
                          <p>Giỏ hàng trống</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cart.map((item) => {
                            const originalPrice = Number(
                              item.price || item.originalPrice || 0
                            );
                            const discountedPrice = getDiscountedPrice(item);
                            const subtotal = discountedPrice * item.quantity;
                            const hasPromotion =
                              discountedPrice < originalPrice;

                            return (
                              <div
                                key={item.productCode}
                                className="border border-gray-200 rounded p-3"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4
                                    title={item.productName}
                                    className="font-medium text-sm text-gray-900 truncate flex-1"
                                  >
                                    {item.productName}
                                  </h4>
                                  <button
                                    onClick={() =>
                                      removeFromCart(item.productCode)
                                    }
                                    className="text-red-500 hover:text-red-700 ml-2"
                                  >
                                    <FaTrash size={12} />
                                  </button>
                                </div>

                                <div className="text-xs text-gray-500 mb-2">
                                  {item.productCode}
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.productCode,
                                          item.quantity - 1
                                        )
                                      }
                                      className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                                    >
                                      <FaMinus size={10} />
                                    </button>
                                    <span className="text-sm font-medium w-8 text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.productCode,
                                          item.quantity + 1
                                        )
                                      }
                                      className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                                    >
                                      <FaPlus size={10} />
                                    </button>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-green-600">
                                      {formatCurrency(subtotal)}đ
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {hasPromotion ? (
                                        <>
                                          <span className="line-through text-xs text-gray-400 mr-2">
                                            {formatCurrency(originalPrice)}đ
                                          </span>
                                          <span className="font-medium text-red-600">
                                            {formatCurrency(discountedPrice)}
                                            đ/sp
                                          </span>
                                        </>
                                      ) : (
                                        <span>
                                          {formatCurrency(originalPrice)}đ/sp
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Customer Section */}
                  {activeSection === "customer" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tên khách hàng
                        </label>
                        <input
                          value={customer.name}
                          onChange={(e) =>
                            setCustomer({ ...customer, name: e.target.value })
                          }
                          placeholder="Nhập tên khách hàng..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Số điện thoại
                        </label>
                        <input
                          value={customer.phone}
                          onChange={(e) =>
                            setCustomer({ ...customer, phone: e.target.value })
                          }
                          placeholder="Nhập số điện thoại..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email (tùy chọn)
                        </label>
                        <input
                          value={customer.email}
                          onChange={(e) =>
                            setCustomer({ ...customer, email: e.target.value })
                          }
                          placeholder="Nhập email..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Địa chỉ (tùy chọn)
                        </label>
                        <textarea
                          value={customer.address}
                          onChange={(e) =>
                            setCustomer({
                              ...customer,
                              address: e.target.value
                            })
                          }
                          placeholder="Nhập địa chỉ..."
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Discount Section */}
                  {activeSection === "discount" && (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-500">
                        Lưu ý: Phần "Giảm giá" ở đây là giảm giá áp dụng sau
                        cùng — sau khi đã tính khuyến mãi sản phẩm và chiết khấu
                        thành viên.
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Loại giảm giá
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setDiscountType("percent")}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              discountType === "percent"
                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <FaTag className="mx-auto mb-1" />
                            <div className="text-sm font-medium">
                              Phần trăm (%)
                            </div>
                          </button>
                          <button
                            onClick={() => setDiscountType("fixed")}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              discountType === "fixed"
                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <FaMoneyBillWave className="mx-auto mb-1" />
                            <div className="text-sm font-medium">
                              Số tiền cố định
                            </div>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {discountType === "percent"
                            ? "Phần trăm giảm giá"
                            : "Số tiền giảm"}
                        </label>
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          placeholder={
                            discountType === "percent"
                              ? "Nhập % (0-100)"
                              : "Nhập số tiền"
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          max={
                            discountType === "percent"
                              ? 100
                              : Math.max(
                                  0,
                                  calculateSubtotal() - memberDiscountAmount
                                )
                          }
                          min={0}
                        />
                      </div>

                      {discount > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-sm text-purple-700">
                            <div className="flex justify-between">
                              <span>Tạm tính (gốc):</span>
                              <span>{formatCurrency(originalSubtotal)}đ</span>
                            </div>
                            {productPromotionDiscount > 0 && (
                              <div className="flex justify-between">
                                <span>Giảm giá sản phẩm:</span>
                                <span>
                                  -{formatCurrency(productPromotionDiscount)}đ
                                </span>
                              </div>
                            )}
                            {memberDiscountAmount > 0 && (
                              <div className="flex justify-between">
                                <span>Giảm giá khách hàng:</span>
                                <span>
                                  -{formatCurrency(memberDiscountAmount)}đ
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-1">
                              <span>Tạm tính (sau KM + thành viên):</span>
                              <span>
                                {formatCurrency(
                                  calculateSubtotal() - memberDiscountAmount
                                )}
                                đ
                              </span>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span>Giảm giá (áp dụng thêm):</span>
                              <span>
                                -{formatCurrency(calculateDiscount())}đ
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-purple-800 border-t border-purple-200 pt-2 mt-2">
                              <span>Tổng cộng:</span>
                              <span>{formatCurrency(calculateTotal())}đ</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Section */}
                  {activeSection === "payment" && (
                    <div className="space-y-4">
                      {/* Order Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">
                          Tóm tắt đơn hàng
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Tạm tính (gốc):</span>
                            <span>{formatCurrency(originalSubtotal)}đ</span>
                          </div>
                          {productPromotionDiscount > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Giảm giá sản phẩm:</span>
                              <span>
                                -{formatCurrency(productPromotionDiscount)}đ
                              </span>
                            </div>
                          )}
                          {memberDiscountAmount > 0 && (
                            <div className="flex justify-between text-blue-600">
                              <span>Giảm giá khách hàng:</span>
                              <span>
                                -{formatCurrency(memberDiscountAmount)}đ
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-1">
                            <span>Tạm tính (sau KM + thành viên):</span>
                            <span>
                              {formatCurrency(
                                calculateSubtotal() - memberDiscountAmount
                              )}
                              đ
                            </span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Giảm giá thêm:</span>
                              <span>
                                -{formatCurrency(calculateDiscount())}đ
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold text-green-600 border-t pt-2">
                            <span>Tổng cộng:</span>
                            <span>{formatCurrency(calculateTotal())}đ</span>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info Preview */}
                      {(customer.name || customer.phone) && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <h4 className="font-medium text-blue-800 mb-2">
                            Thông tin khách hàng
                          </h4>
                          <div className="text-sm text-blue-700">
                            {customer.name && <div>Tên: {customer.name}</div>}
                            {customer.phone && <div>SĐT: {customer.phone}</div>}
                          </div>
                        </div>
                      )}

                      {/* Checkout Button */}
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        disabled={isProcessing || cart.length === 0}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-4 rounded-lg text-lg font-bold hover:from-orange-700 hover:to-orange-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                      >
                        <FaCheck />
                        {isProcessing
                          ? "Đang xử lý..."
                          : "Xác nhận thanh toán và in hóa đơn"}
                      </button>
                    </div>
                  )}
                </div>
                {/* Footer Actions */}
                {(cart.length > 0 || activeSection !== "cart") && (
                  <div className="border-t bg-gray-50 p-4 space-y-4">
                    {activeSection === "cart" && (
                      <>
                        <div className="bg-white rounded-xl p-4 space-y-3">
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <FaCalculator />
                            Tổng kết đơn hàng
                          </h3>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                Tạm tính (gốc):
                              </span>
                              <span className="font-medium">
                                {formatCurrency(originalSubtotal)}đ
                              </span>
                            </div>

                            <div className="flex justify-between text-sm text-red-600">
                              <span>Giảm giá sản phẩm:</span>
                              <span className="font-medium">
                                -{formatCurrency(productPromotionDiscount)}đ
                              </span>
                            </div>

                            {memberDiscountAmount > 0 && (
                              <div className="flex justify-between text-sm text-blue-700">
                                <span>
                                  Giảm giá khách hàng (
                                  {(memberRate * 100).toFixed(2)}%):
                                </span>
                                <span className="font-medium">
                                  -{formatCurrency(memberDiscountAmount)}đ
                                </span>
                              </div>
                            )}

                            {otherInlineDiscount > 0 && (
                              <div className="flex justify-between text-sm text-red-600">
                                <span>Giảm giá khác:</span>
                                <span className="font-medium">
                                  -{formatCurrency(otherInlineDiscount)}đ
                                </span>
                              </div>
                            )}

                            <div className="border-t pt-2 flex justify-between text-lg font-bold">
                              <span className="text-gray-800">Tổng cộng:</span>
                              <span className="text-green-600">
                                {formatCurrency(calculateTotal())}đ
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setActiveSection("customer")}
                              className="bg-blue-100 text-blue-700 py-3 px-4 rounded-xl font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <FaUser />
                              Khách hàng
                            </button>
                            <button
                              onClick={() => setActiveSection("discount")}
                              className="bg-purple-100 text-purple-700 py-3 px-4 rounded-xl font-medium hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <FaGift />
                              Giảm giá
                            </button>
                          </div>

                          <button
                            onClick={() => setActiveSection("payment")}
                            disabled={isProcessing}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl text-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                          >
                            <FaCalculator />
                            Thanh toán
                          </button>

                          <div className="grid grid-cols-1 gap-3">
                            <button
                              onClick={() => setShowClearConfirm(true)}
                              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <FaTrash />
                              Xóa tất cả
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {activeSection === "customer" && (
                      <button
                        onClick={() => setActiveSection("cart")}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Lưu thông tin
                      </button>
                    )}

                    {activeSection === "discount" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setDiscount(0);
                            setActiveSection("cart");
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => setActiveSection("cart")}
                          className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Áp dụng
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && lastOrder && (
        <POSInvoice
          order={lastOrder}
          onClose={() => setShowInvoice(false)}
          onPrint={() => {
            // Focus on invoice content for better printing
            const invoiceContent = document.getElementById("invoice-content");
            if (invoiceContent) {
              window.print();
            }
          }}
        />
      )}

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[90%] max-w-lg mx-4 transform transition-all">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCreditCard className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Chọn phương thức thanh toán
              </h3>
              <p className="text-gray-600">
                Vui lòng chọn cách thức thanh toán phù hợp
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Cash Payment */}
              <button
                onClick={async () => {
                  // Open a dedicated cash modal to enter received amount
                  setShowPaymentModal(false);
                  setShowCashModal(true);
                }}
                className="group p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-300 flex flex-col items-center space-y-3"
              >
                <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center transition-colors">
                  <FaMoneyBillWave className="text-green-600 text-xl" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 group-hover:text-green-700">
                    Tiền mặt
                  </h4>
                  <p className="text-sm text-gray-500">Thanh toán trực tiếp</p>
                </div>
              </button>

              {/* QR Payment */}
              <button
                onClick={async () => {
                  setShowPaymentModal(false);
                  await handleCheckout("qr");
                }}
                className="group p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 flex flex-col items-center space-y-3"
              >
                <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
                  <FaQrcode className="text-blue-600 text-xl" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 group-hover:text-blue-700">
                    QR Code
                  </h4>
                  <p className="text-sm text-gray-500">Chuyển khoản nhanh</p>
                </div>
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
              >
                <FaTimes className="text-sm" />
                <span>Hủy bỏ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Payment Modal (enter amount given & confirm) */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Thanh toán tiền mặt</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">
                  Tổng cần thanh toán
                </label>
                <div className="text-2xl font-bold">
                  {formatCurrency(calculateTotal())}đ
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Khách đưa</label>
                <input
                  type="number"
                  min={0}
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="w-full border p-3 rounded-lg mt-1"
                  placeholder="Nhập số tiền khách đưa"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Tiền thừa</label>
                <div
                  className={`text-lg font-semibold ${
                    getChange() < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(getChange())}đ
                </div>
                {getChange() < 0 && (
                  <div className="text-sm text-red-600">
                    Số tiền khách đưa chưa đủ
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCashModal(false);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  // require enough payment
                  if (getChange() < 0) return toast.error("Số tiền chưa đủ");
                  setShowCashModal(false);
                  await handleCheckout("cash");
                  // allow invoice to render then print
                  setTimeout(() => {
                    const invoiceContent =
                      document.getElementById("invoice-content");
                    if (invoiceContent) window.print();
                  }, 500);
                }}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
              >
                Xác nhận & In hóa đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment Modal */}
      {showQRModal && sepayOrderCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[95%] max-w-5xl mx-4 transform transition-all max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <BsBank className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Thanh toán QR Code</h3>
                    <p className="text-blue-100">Quét mã để chuyển khoản</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (pollingRef.current) {
                      clearInterval(pollingRef.current);
                      pollingRef.current = null;
                    }
                    setSepayActive(false);
                    setShowQRModal(false);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Countdown */}
              <div className="mb-6">
                <QrPaymentCountdown
                  onExpire={() => {
                    if (pollingRef.current) {
                      clearInterval(pollingRef.current);
                      pollingRef.current = null;
                    }
                    try {
                      localStorage.removeItem("countdownEndTime");
                    } catch (e) {}
                    setSepayActive(false);
                    setShowQRModal(false);
                    toast.warn("Payment time expired");
                  }}
                />
              </div>

              {/* Waiting indicator */}
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-600 font-medium">
                  Đang chờ thanh toán...
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* QR Code Section */}
                <div className="flex flex-col items-center space-y-4">
                  <h4 className="text-xl font-bold text-gray-800 mb-2">
                    Quét mã QR để thanh toán
                  </h4>
                  <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-gray-100">
                    <div className="w-64 h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden relative">
                      <img
                        src={`https://qr.sepay.vn/img?acc=VQRQADYBO0539&bank=MBBank&amount=${
                          lastOrder?.finalAmount || calculateTotal()
                        }&des=${lastOrder?.orderCode || sepayOrderCode}`}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                      {/* Scan effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500 via-opacity-20 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Download QR code functionality
                      const link = document.createElement("a");
                      const orderCodeForTransfer =
                        lastOrder?.orderCode || sepayOrderCode;
                      link.href = `https://qr.sepay.vn/img?acc=VQRQADYBO0539&bank=MBBank&amount=${
                        lastOrder?.finalAmount || calculateTotal()
                      }&des=${orderCodeForTransfer}`;
                      link.download = `qr-${orderCodeForTransfer}.png`;
                      link.click();
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <FaDownload />
                    <span>Tải xuống QR</span>
                  </button>
                </div>

                {/* Bank Info Section */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-white bg-opacity-10 rounded-full flex items-center justify-center">
                      <BsBank className="text-2xl" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">MBBank</h4>
                      <p className="text-gray-300">Chuyển khoản ngân hàng</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Account Owner */}
                    <div className="flex justify-between items-center py-3 border-b border-gray-600">
                      <span className="text-gray-300 text-sm uppercase tracking-wide">
                        Chủ tài khoản
                      </span>
                      <div className="text-right">
                        <p className="font-bold">DANG KHOI NGUYEN</p>
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="flex justify-between items-center py-3 border-b border-gray-600">
                      <span className="text-gray-300 text-sm uppercase tracking-wide">
                        Số tài khoản
                      </span>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold">VQRQADYBO0539</p>
                        <button
                          onClick={() => handleCopy("VQRQADYBO0539")}
                          className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                        >
                          <IoCopy />
                        </button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex justify-between items-center py-3 border-b border-gray-600">
                      <span className="text-gray-300 text-sm uppercase tracking-wide">
                        Số tiền
                      </span>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-green-400">
                          {formatCurrency(
                            lastOrder?.finalAmount || calculateTotal()
                          )}{" "}
                          VND
                        </p>
                        <button
                          onClick={() =>
                            handleCopy(
                              (
                                lastOrder?.finalAmount || calculateTotal()
                              ).toString()
                            )
                          }
                          className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                        >
                          <IoCopy />
                        </button>
                      </div>
                    </div>

                    {/* Transfer Content */}
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-300 text-sm uppercase tracking-wide">
                        Nội dung chuyển khoản
                      </span>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-yellow-400">
                          {lastOrder?.orderCode || sepayOrderCode}
                        </p>
                        <button
                          onClick={() =>
                            handleCopy(lastOrder?.orderCode || sepayOrderCode)
                          }
                          className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                        >
                          <IoCopy />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="mt-6 pt-4 border-t border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold uppercase">
                        Tổng thanh toán
                      </span>
                      <span className="text-2xl font-bold text-green-400">
                        {formatCurrency(
                          lastOrder?.finalAmount || calculateTotal()
                        )}{" "}
                        VND
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-blue-800 mb-1">
                      Hướng dẫn thanh toán
                    </h5>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Mở ứng dụng ngân hàng và quét mã QR</li>
                      <li>• Kiểm tra thông tin và xác nhận chuyển khoản</li>
                      <li>• Hệ thống sẽ tự động xác nhận khi nhận được tiền</li>
                      <li>
                        • <strong>Lưu ý:</strong> Nhập chính xác nội dung chuyển
                        khoản
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Invoice Modal */}
      {showInvoice && lastOrder && lastOrder.paymentMethod === "cash" && (
        <InvoiceModal
          order={lastOrder}
          onClose={() => {
            setShowInvoice(false);
            setLastOrder(null);
          }}
        />
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-[90%] max-w-md">
            <h3 className="text-lg font-semibold mb-3">Xác nhận xóa tất cả</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có chắc muốn xóa toàn bộ giỏ hàng và thông tin khách hàng đã
              nhập? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={confirmClearAll}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSPage;
