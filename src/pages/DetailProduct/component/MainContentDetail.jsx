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

const MainContentDetail = ({ product }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetComment, setIsResetComment] = useState(false);
  const [listComment, setListComment] = useState([]);
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

  // useEffect(() => {
  //   commentService
  //     .findAllCommentByProductId(_id)
  //     .then((res) => {
  //       if (res.data.length > 0) {
  //         setListComment(res.data);
  //       } else {
  //         setListComment(null);
  //       }
  //     })
  //     .catch();
  // }, [isResetComment]);

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
          <h2 className="text-center mt-3">Your Payment is 100% Secure</h2>
          {/* Thông tin khác */}
          <div className="flex space-x-3">
            <p>SKU:</p>
            <p className="text-third">{productCode}</p>
          </div>
          <div className="flex space-x-3">
            <p>Category:</p>
            <p className="text-third">{displayCategory}</p>
          </div>
          <div className="flex space-x-3">
            <p>Author:</p>
            <p className="text-third">{author}</p>
          </div>
          {/* additional information */}
          <div>
            {/* Header */}
            <div
              className="bg-gray-200 flex space-x-3 items-center px-2 py-1 cursor-pointer"
              onClick={() => setIsShowInfo(!isShowInfo)}
            >
              <span
                className={`transition-transform duration-500 ease-in-out ${
                  isShowInfo ? "-rotate-180" : "rotate-0"
                }`}
              >
                <IoIosArrowDown />
              </span>
              <h2>ADDITIONAL INFORMATION</h2>
            </div>

            {/* Content */}
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                isShowInfo ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {/* <table className="w-full text-third">
                <tbody>
                  <tr className="border-b h-20">
                    <td>Size</td>
                    <td>
                      {sizes.map((item, index) => (
                        <span key={index}>
                          {item}
                          {index < sizes.length - 1 && ", "}
                        </span>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table> */}
            </div>
          </div>
          {/* rating */}
          <div>
            {/* Header */}
            <div
              className="bg-gray-200 flex space-x-3 items-center px-2 py-1 cursor-pointer"
              onClick={() => setIsShowRating(!isShowRating)}
            >
              <span
                className={`transition-transform duration-500 ease-in-out ${
                  isShowRating ? "-rotate-180" : "rotate-0"
                }`}
              >
                <IoIosArrowDown />
              </span>
              <h2>Rating reviews ({listComment ? listComment.length : 0})</h2>
            </div>

            {/* Content */}
            <div
              className={`py-10 flex flex-col text-lg space-y-5 transition-all duration-500 ease-in-out overflow-hidden ${
                isShowRating
                  ? "max-h-[1500px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <h2 className="border-b pb-5">Reviews</h2>
              {listComment ? (
                listComment?.map((item) => {
                  return (
                    <CommentCustom
                      item={item}
                      userInfo={userInfo}
                      setIsResetComment={setIsResetComment}
                    />
                  );
                })
              ) : (
                <p className="text-third">There are no reviews yet.</p>
              )}

              <p className="pt-20 border-b pb-5">
                Be the first to review “10K Yellow Gold”
              </p>
              <p className="text-third">
                Your email address will not be published. Required fields are
                marked
              </p>

              {userInfo ? (
                <div className="flex flex-col space-y-5">
                  {/* rating star */}
                  {/* <div>
                    <h2>
                      Your rating <span className="text-red-500">*</span>
                    </h2>
                    <div>
                      <RatingCustom />
                    </div>
                  </div> */}
                  {/* review */}
                  <form onSubmit={formik.handleSubmit}>
                    <div>
                      <h2>
                        Your review <span className="text-red-500">*</span>
                        <div>
                          <textarea
                            className="border w-full p-5 text-lg outline-none"
                            name="review"
                            rows={7}
                            value={formik.values.review}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                          />

                          {formik.touched.review && formik.errors.review ? (
                            <p className="text-red-500 text-sm mt-1">
                              {formik.errors.review}
                            </p>
                          ) : null}
                        </div>
                      </h2>
                    </div>

                    <div className="mt-10">
                      <Button type="submit" content={"SUBMIT"} />
                    </div>
                  </form>
                </div>
              ) : (
                <p>Login your account to review this item!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainContentDetail;
