import React, { useContext, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InputNumberCustom from "~/pages/Cart/component/InputNumberCustom/InputNumberCustom";
import Button from "~/components/Button/Button";
import { BsCart3 } from "react-icons/bs";
import { TfiReload } from "react-icons/tfi";

import { iconArr } from "~/assets/ContentArrProject/Footer/MenuAndIcon";
import { IoIosArrowDown } from "react-icons/io";
import { useAddToCart } from "~/hooks/useAddToCart";
import FavoriteItemAnimation from "../../../components/FavoriteItemAnimation/FavoriteItemAnimation";
import RatingCustom from "./RatingCustom";

import { Fancybox } from "@fancyapps/ui/dist/fancybox/";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { buildImageUrl } from "~/lib/utils";
import { StoreContext } from "~/contexts/StoreProvider";
import { commentService } from "~/apis/commentService";
import CommentCustom from "./CommentCustom";
import InputCustom from "~/components/InputCustom/InputCustom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ToastifyContext } from "~/contexts/ToastifyProvider";
import Loading from "~/components/Loading/Loading";
import ImageCarousel from "./ImageCarousel";

// Seeded mock reviews for local/dev preview — replace with API data as needed
const MOCK_COMMENTS = [
  {
    _id: "r1",
    userId: "u1",
    username: "alice",
    rating: 5,
    comment:
      "Absolutely loved this book — informative, well-paced and a pleasure to read.",
    images: [],
    is_verified_purchase: true,
    createAt: "2025-11-01T10:00:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z"
  },
  {
    _id: "r2",
    userId: "u2",
    username: "bob",
    rating: 4,
    comment:
      "Great content but a little long in parts. Recommended for enthusiasts.",
    images: [],
    is_verified_purchase: false,
    createAt: "2025-10-15T14:30:00.000Z",
    updatedAt: "2025-10-15T14:30:00.000Z"
  }
];

// Questions (Q&A) - local state UI (seeded with mock data for preview)
const MOCK_QUESTIONS = [
  {
    id: "q1",
    userId: "u3",
    user: "charlie",
    text: "Is this the latest edition of the book?",
    date: "2025-11-05T08:20:00.000Z",
    answers: [
      {
        id: "a1",
        responderId: "shop1",
        responder: "BookStore Official",
        isShop: true,
        isVerifiedBuyer: false,
        text: "Yes — this listing is for the latest 3rd edition.",
        date: "2025-11-05T09:00:00.000Z"
      }
    ]
  },
  {
    id: "q2",
    userId: "u4",
    user: "diana",
    text: "Does this edition include practice exercises at the end of chapters?",
    date: "2025-10-20T12:00:00.000Z",
    answers: []
  }
];
const MainContentDetail = ({ product }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetComment, setIsResetComment] = useState(false);

  const [listComment, setListComment] = useState(MOCK_COMMENTS);
  const [isShowInfo, setIsShowInfo] = useState(false);
  const [isShowRating, setIsShowRating] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { formatVND } = useStransferToVND();
  const { toast } = useContext(ToastifyContext);
  const { userInfo } = useContext(StoreContext);
  // Map API fields to component variables for compatibility
  const {
    image,
    productName,
    name,
    author,
    categoryCode,
    category,
    price = "Contact",
    description,
    productCode
  } = product || {};

  // Use mapped values with fallbacks
  const displayName = productName || name || "Unknown Product";
  const displayCategory = category || categoryCode || "Unknown Category";
  const displayImages = buildImageUrl(image);
  const { handleAddToCart } = useAddToCart(product, quantity);
  Fancybox.bind("[data-fancybox]", {});

  // Promotion calculation using product.promotion.value
  const rawPrice = Number(price);
  let hasPromotion = false;
  let finalPrice = null;
  let discountAmount = 0;
  let discountPercent = 0;
  if (
    product?.promotion &&
    product.promotion.value != null &&
    !Number.isNaN(rawPrice) &&
    rawPrice > 0
  ) {
    const v = Number(product.promotion.value);
    if (v > 0) {
      hasPromotion = true;
      if (v <= 1) {
        discountPercent = Math.round(v * 100);
        finalPrice = Math.round(rawPrice * (1 - v));
        discountAmount = rawPrice - finalPrice;
      } else {
        discountAmount = v;
        finalPrice = Math.max(0, rawPrice - discountAmount);
        discountPercent =
          rawPrice > 0 ? Math.round((discountAmount / rawPrice) * 100) : 0;
      }
    }
  }

  const formik = useFormik({
    initialValues: {
      review: ""
    },
    validationSchema: Yup.object({
      review: Yup.string().required("Please type your reviews!")
    }),
    onSubmit: (values) => {
      const data = {
        userId: userInfo._id,
        productId: productCode,
        comment: values.review
      };
      commentService
        .createNew(data)
        .then((res) => {
          setIsLoading(true);
          setTimeout(() => {
            setIsLoading(false);
            toast.success(res.data.message);
            setIsResetComment((prev) => !prev);
            formik.resetForm();
          }, 1000);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });

  const [listQuestions, setListQuestions] = useState(MOCK_QUESTIONS);
  const [questionText, setQuestionText] = useState("");

  // --- Review stats + edit/create UI state ---
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editRating, setEditRating] = useState(5);
  const [editCommentText, setEditCommentText] = useState("");

  const computeReviewStats = (reviews) => {
    const total = Array.isArray(reviews) ? reviews.length : 0;
    const avg = total
      ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / total
      : 0;
    const byStar = [5, 4, 3, 2, 1].map((star) => {
      const count = (reviews || []).filter(
        (r) => Number(r.rating) === star
      ).length;
      return {
        star,
        count,
        percent: total ? Math.round((count / total) * 100) : 0
      };
    });
    return { total, avg: Math.round(avg * 10) / 10, byStar };
  };

  const stats = computeReviewStats(listComment);

  const findUserReview = () => {
    if (!userInfo || !userInfo._id) return null;
    return (listComment || []).find((r) => r.userId === userInfo._id) || null;
  };

  const userReview = findUserReview();

  const startEditReview = () => {
    if (!userReview) {
      setEditRating(5);
      setEditCommentText("");
      setIsEditingReview(true);
      return;
    }
    setEditRating(userReview.rating || 5);
    setEditCommentText(userReview.comment || "");
    setIsEditingReview(true);
  };

  const saveReview = () => {
    if (!isVerifiedBuyer()) {
      toast?.error?.("Only verified buyers can submit reviews.");
      return;
    }
    if (!editCommentText || editCommentText.trim().length < 5) {
      toast?.error?.("Please write a longer review (5+ characters).");
      return;
    }
    if (userReview) {
      setListComment((prev) =>
        prev.map((r) =>
          r.userId === userInfo._id
            ? {
                ...r,
                rating: editRating,
                comment: editCommentText.trim(),
                updatedAt: new Date().toISOString()
              }
            : r
        )
      );
      toast?.success?.("Review updated.");
    } else {
      const newR = {
        _id: `r_${Date.now()}`,
        userId: userInfo?._id || `guest_${Date.now()}`,
        username: userInfo?.username || "Guest",
        rating: editRating,
        comment: editCommentText.trim(),
        images: [],
        is_verified_purchase: true,
        createAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setListComment((prev) => [newR, ...prev]);
      toast?.success?.("Review submitted. Thank you!");
    }
    setIsEditingReview(false);
  };

  const submitQuestion = (e) => {
    e.preventDefault();
    if (!questionText || questionText.trim().length < 3) {
      toast?.error?.("Please write a short question (3+ characters).");
      return;
    }
    const newQ = {
      id: Date.now(),
      user: userInfo?.username || "Guest",
      text: questionText.trim(),
      date: new Date().toISOString()
    };
    // optimistic UI add
    setListQuestions((prev) => [newQ, ...prev]);
    setQuestionText("");
    toast?.success?.("Question submitted. Thank you!");
    // TODO: send to backend when API available
  };

  // Placeholder check for verified purchaser. Replace with real API check.
  const isVerifiedBuyer = () => {
    try {
      // Example: userInfo.purchasedProducts could be an array of productCodes
      return (
        !!userInfo &&
        Array.isArray(userInfo.purchasedProducts) &&
        userInfo.purchasedProducts.includes(productCode)
      );
    } catch {
      return false;
    }
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="flex flex-wrap xl:flex-nowrap gap-10">
        {/* Hình ảnh sản phẩm */}
        {/* <ImageCarousel images={displayImages} /> */}
        <div className="w-full xl:w-2/5 overflow-hidden group relative">
          {hasPromotion && (
            <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg">
              {discountAmount > 0
                ? `-${formatVND(discountAmount)}`
                : `-${discountPercent}%`}
            </div>
          )}
          <img
            src={displayImages}
            alt={displayName}
            className="w-full h-auto transition-transform duration-500 ease-in-out group-hover:scale-105"
          />
        </div>

        {/* Thông tin sản phẩm */}
        <div className="w-full xl:w-3/5 flex flex-col space-y-3">
          <h2 className="text-3xl">{displayName}</h2>
          {hasPromotion && finalPrice != null ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-red-600">
                  {formatVND(finalPrice)}
                </div>
                <div className="text-lg text-gray-400 line-through">
                  {formatVND(price)}
                </div>
              </div>
              <div className="text-sm text-red-600">
                Tiết kiệm {formatVND(discountAmount)} ({discountPercent}%)
              </div>
            </div>
          ) : (
            <p className="text-xl">
              {isNaN(Number(price)) ? price : formatVND(price)}
            </p>
          )}
          <p>{description}</p>

          {/* Số lượng + Add to cart */}
          <div className="flex items-center space-x-5">
            <div>
              <InputNumberCustom
                defaultValue={{ quantity: quantity, cartId: productCode }}
                setQuantity={setQuantity}
              />
            </div>
            <div className="w-full">
              <Button
                onClick={handleAddToCart}
                w="w-full"
                content={
                  <div className="flex items-center space-x-3">
                    <BsCart3 />
                    <p>ADD TO CART</p>
                  </div>
                }
              />
            </div>
          </div>
          {/* OR */}
          <div className="flex items-center space-x-3">
            <div className="border-t w-full"></div>
            <p>OR</p>
            <div className="border-t w-full"></div>
          </div>
          {/* Heart + Reload */}
          <div className="flex items-center space-x-3">
            <div className="relative flex justify-center items-center border rounded-full">
              <FavoriteItemAnimation product={product} p3="p-3" />
            </div>
            <span className="border p-3 cursor-pointer rounded-full">
              <TfiReload />
            </span>
          </div>
          {/* Safe checkout */}
          <div className="border px-20">
            <h2 className="text-center -translate-y-3 bg-white text-xl">
              GURANTED <span className="text-green-500">SAFE</span> CHECKOUT
            </h2>
            <div className="flex  justify-center items-center gap-5 mb-5 text-5xl">
              {iconArr.map((item, index) => (
                <span key={index}>{item}</span>
              ))}
            </div>
          </div>
          <h2 className="text-center mt-3 py-20">
            Your Payment is 100% Secure
          </h2>

          {/* Product Details Card */}
          <div className="p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Product Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  SKU Code
                </div>
                <div className="font-medium text-gray-800 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {productCode}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Category
                </div>
                <div className="font-medium text-gray-800 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  {displayCategory}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Author
                </div>
                <div className="font-medium text-gray-800 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  {author || "Unknown"}
                </div>
              </div>
            </div>
          </div>
          {/* Additional Information */}
          <div className="bg-white  border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div
              className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 flex items-center justify-between px-6 py-4 cursor-pointer border-b border-gray-200"
              onClick={() => setIsShowInfo(!isShowInfo)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📋</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Additional Information
                </h3>
              </div>
              <span
                className={`transition-transform duration-300 ease-in-out text-blue-600 ${
                  isShowInfo ? "rotate-180" : "rotate-0"
                }`}
              >
                <IoIosArrowDown className="text-xl" />
              </span>
            </div>

            {/* Content */}
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                isShowInfo ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      Product Description
                    </div>
                    <div className="text-gray-800">
                      {description || "No additional description available."}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      Availability
                    </div>
                    <div className="flex items-center text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      In Stock
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Reviews Section */}
          <div className="bg-white  border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div
              className="bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 transition-all duration-300 flex items-center justify-between px-6 py-4 cursor-pointer border-b border-gray-200"
              onClick={() => setIsShowRating(!isShowRating)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 text-sm">⭐</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Customer Reviews
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {listComment ? listComment.length : 0}{" "}
                      {listComment?.length === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`transition-transform duration-300 ease-in-out text-amber-600 ${
                  isShowRating ? "rotate-180" : "rotate-0"
                }`}
              >
                <IoIosArrowDown className="text-xl" />
              </span>
            </div>

            {/* Content */}
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                isShowRating
                  ? "max-h-[1500px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-6">
                <h4 className="text-lg font-medium text-gray-800 mb-6">
                  All Reviews
                </h4>

                {/* Review statistics */}
                <div className="mb-6 flex items-start gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-amber-600">
                      {stats.avg || 0}
                    </div>
                    <div className="text-sm text-gray-500">
                      {stats.total} reviews
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {stats.byStar.map((s) => (
                      <div key={s.star} className="flex items-center gap-3">
                        <div className="w-10 text-sm text-gray-700">
                          {s.star}★
                        </div>
                        <div className="h-2 bg-gray-200 flex-1 rounded overflow-hidden">
                          <div
                            style={{ width: `${s.percent}%` }}
                            className="h-full bg-amber-400"
                          />
                        </div>
                        <div className="w-12 text-sm text-gray-600 text-right">
                          {s.percent}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review create / edit area */}
                <div className="mb-6">
                  {isEditingReview ? (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
                      <label className="text-sm">Your rating</label>
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(Number(e.target.value))}
                        className="px-2 py-1 border rounded"
                      >
                        {[5, 4, 3, 2, 1].map((r) => (
                          <option key={r} value={r}>
                            {r} star{r > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Write your review"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={saveReview}
                          className="px-4 py-2 bg-amber-600 text-white rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingReview(false)}
                          className="px-4 py-2 border rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {isVerifiedBuyer() ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={startEditReview}
                            className="px-4 py-2 bg-amber-600 text-white rounded"
                          >
                            {userReview ? "Edit your review" : "Write a review"}
                          </button>
                          {userReview && (
                            <div className="text-sm text-gray-600">
                              You rated this product {userReview.rating}★
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          Only verified buyers can submit reviews.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {listComment && listComment.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-medium text-gray-800">
                        All Reviews
                      </h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Verified purchases only</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {listComment.map((item, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                        >
                          <CommentCustom
                            item={item}
                            userInfo={userInfo}
                            setIsResetComment={setIsResetComment}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400">💬</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-800 mb-2">
                      No Reviews Yet
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Be the first to share your experience with this product.
                    </p>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-600">ℹ️</span>
                      <span className="font-medium text-blue-800">
                        Review Policy
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Reviews are moderated and only verified buyers can submit
                      ratings. If you purchased this product, make sure your
                      account is linked to the order so you can leave a review.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Questions & Answers */}
          <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Questions & Answers</h3>

            <form onSubmit={submitQuestion} className="mb-4">
              <label className="text-sm text-gray-600 mb-2 block">
                Ask a question about this product
              </label>
              <div className="flex gap-3">
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="What would you like to ask?"
                  rows={4}
                  maxLength={500}
                  aria-label="Question about product"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none resize-y"
                />
              </div>
              <div className="my-10 w-full">
                <Button w="w-full" content={"ASK"} />
              </div>
            </form>

            <div className="space-y-3">
              {listQuestions.length === 0 ? (
                <p className="text-gray-500">
                  No questions yet. Be the first to ask.
                </p>
              ) : (
                listQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="border border-gray-100 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{q.user}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(q.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(q.date).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-gray-800 mb-3">{q.text}</div>

                    {/* Answers */}
                    {q.answers && q.answers.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {q.answers.map((a) => (
                          <div
                            key={a.id}
                            className="bg-gray-50 p-3 rounded border"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{a.responder}</div>
                                {a.isShop && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    Shop
                                  </span>
                                )}
                                {a.isVerifiedBuyer && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    Real Buyer
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(a.date).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-gray-800">{a.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainContentDetail;
