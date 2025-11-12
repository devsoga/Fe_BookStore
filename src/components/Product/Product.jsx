import React, { useContext, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { productIcon } from "~/assets/ContentArrProject/ListProduct/ListProduct";
import Button from "../Button/Button";
import { SidebarContext } from "~/contexts/SidebarProvider";
import { useNavigate } from "react-router-dom";
import { useAddToCart } from "~/hooks/useAddToCart";
import Loading from "../Loading/Loading";
import { StoreContext } from "~/contexts/StoreProvider";
import { useAddToFavorite } from "~/hooks/useAddToFavorite";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { buildImageUrl } from "~/lib/utils";
import FavoriteItemAnimation from "../FavoriteItemAnimation/FavoriteItemAnimation";

const Product = ({ item, addCartBtn = false, setIsLoadingFunction }) => {
  // support both API shape and original shape
  const { image, productName, categoryCode, price = 1, productCode } = item;

  // Promotion detection using item.promotion.value
  // value <= 1: percentage discount (e.g., 0.2 = 20%)
  // value > 1: fixed amount discount (e.g., 50000 = 50,000 VND off)
  let hasPromotion = false;
  let finalPrice = price;
  let discountPercent = 0;
  let discountAmount = 0;
  // discountLabel will be built at render time (after formatVND is available)
  let discountLabel = null;

  if (item.promotion && item.promotion.value != null) {
    const promotionValue = Number(item.promotion.value);

    if (promotionValue > 0) {
      hasPromotion = true;

      if (promotionValue <= 1) {
        // Percentage discount
        discountPercent = Math.round(promotionValue * 100);
        finalPrice = Math.round(Number(price) * (1 - promotionValue));
        discountLabel = `-${discountPercent}%`;
      } else {
        // Fixed amount discount
        discountAmount = promotionValue;
        finalPrice = Math.max(0, Number(price) - discountAmount);
        discountPercent = Math.round((discountAmount / Number(price)) * 100);
        // don't format here; format in JSX after hook initialization
        discountLabel = `-${discountAmount}`;
      }
    }
  }
  const [loading, setLoading] = useState(false);

  const {
    setIsOpenSidebar,
    setTitleSidebar,
    titleSidebar,
    setCurrentItemToSee
  } = useContext(SidebarContext);
  const [isWishList, setIsWishList] = useState(false);
  const { listItemFavorite, handleFavoriteItem } = useContext(StoreContext);

  // useEffect(() => {
  //   setIsWishList(handleFavoriteItem(listItemFavorite, _id));
  // }, [listItemFavorite]);

  const { formatVND } = useStransferToVND();
  const navigate = useNavigate();
  // compute id and handle navigate to detail product
  const handleToDetailProduct = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(`/product/${productCode}`);
    }, 300);
  };

  // handle add to cart
  const { handleAddToCart } = useAddToCart(item);

  // handle add to favorite
  // const { handleToFavorite } = useAddToFavorite(item, isWishList);

  return (
    <>
      {loading && <Loading />}
      <div className="w-full">
        {/* Make the interactive image container clip scaled image and keep rounded corners */}
        <div className="group relative border cursor-pointer overflow-hidden ">
          {hasPromotion && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg z-10">
              {discountAmount > 0
                ? `-${formatVND(discountAmount)}`
                : discountLabel || "SALE"}
            </div>
          )}
          <img
            src={buildImageUrl(image)}
            alt={productName}
            className="w-full h-[600px] transition-transform duration-500 ease-in-out group-hover:scale-105 object-cover"
          />
          <div
            onClick={handleToDetailProduct}
            className="absolute top-0 left-0 w-full h-full bg-black/20 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100"
          ></div>
          {/* sidebar on hover */}
          <div
            className="absolute bottom-5 right-5 bg-white 
               opacity-0 translate-x-[20px] invisible 
               group-hover:opacity-100 group-hover:translate-x-0 group-hover:visible 
               transition-all duration-500"
          >
            <p className="hover:bg-gray-200 duration-300 transition-colors cursor-pointer flex items-center justify-center">
              <FavoriteItemAnimation product={item} p3="p-3" />
            </p>
            {productIcon.map((itemIcon, index) => (
              <p
                onClick={() => {
                  switch (itemIcon.code) {
                    case "see":
                      setIsOpenSidebar(true);
                      setTitleSidebar({
                        ...titleSidebar,
                        title: "see",
                        key: "see"
                      });
                      setCurrentItemToSee(item);
                      return;
                    case "detail":
                      handleToDetailProduct();
                      return;
                    default:
                      return <p>Chưa có trạng thái.</p>;
                  }
                }}
                key={index}
                className={`p-3 hover:bg-gray-200 duration-300 transition-colors cursor-pointer`}
              >
                {itemIcon.icon}
              </p>
            ))}
          </div>
        </div>

        {!addCartBtn ? (
          <div className="flex flex-col justify-center space-y-2 text-center">
            <h2 className="text-xl mt-3 max-w-[240px] mx-auto truncate">
              {productName}
            </h2>
            {/* Price display: if there's a promotion show discounted + original */}
            {hasPromotion ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="text-xl font-bold text-red-600">
                    {formatVND(finalPrice)}
                  </div>
                  <div className="text-sm text-gray-400 line-through">
                    {formatVND(price)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-third"> {formatVND(price)}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center space-y-2 ">
            <h2 className="text-xl mt-3 max-w-[240px] mx-auto truncate">
              {productName}
            </h2>
            <p className="text-third">
              {/* {category || categoryCode || "Unknown Category"} */}
            </p>
            {hasPromotion ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="text-xl font-bold text-red-600">
                    {formatVND(finalPrice)}
                  </div>
                  <div className="text-sm text-gray-400 line-through">
                    {formatVND(price)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-third"> {formatVND(price)}</p>
            )}
            <Button
              onClick={handleAddToCart}
              content={"ADD TO CART"}
              px={"px-10"}
              py={"py-2"}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Product;
