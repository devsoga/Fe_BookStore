import React, { createContext, useState } from "react";

export const StoreContext = createContext();

// // login default
// const user = {
//   _id: "68b07f99219dc1142ca9937f",
//   email: "abc123@gmail.com",
//   password: "123456",
//   username: "khoinguyenne"
// };

const StoreProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(() => {
    const savedUser = localStorage.getItem("userInfo");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  // const [userInfo, setUserInfo] = useState(null);

  // onlick
  const [isOnclick, setIsOnclick] = useState(false);
  const setIsOnClickFunction = (value) => {
    setIsOnclick(value);
  };
  // list favorite
  const handleFavoriteItem = (list, proId) => {
    if (!proId) return false;

    // normalize different possible shapes for 'list'
    let arr = [];
    if (Array.isArray(list)) arr = list;
    else if (list && Array.isArray(list.data)) arr = list.data;
    else if (list && Array.isArray(list.items)) arr = list.items;
    else if (
      list &&
      typeof list === "object" &&
      Object.values(list).some((v) => Array.isArray(v))
    ) {
      // pick the first array found in the object
      const firstArray = Object.values(list).find((v) => Array.isArray(v));
      arr = firstArray || [];
    }

    if (!Array.isArray(arr) || arr.length === 0) return false;

    return arr.some((entry) => {
      // entry can be { item: { ... } } or the item itself
      const candidate = entry?.item ? entry.item : entry;
      if (!candidate) return false;
      // product identifier may be stored as productId, productCode, id, _id
      const pid =
        candidate.productId ||
        candidate.productCode ||
        candidate.id ||
        candidate._id;
      return String(pid) === String(proId);
    });
  };

  //  favorite
  const [listItemFavorite, setListItemFavorite] = useState(null);
  const [countItemFavor, setCountItemFavor] = useState(0);
  const setCountItemFavorFunction = (value) => {
    setCountItemFavor(value);
  };
  const setListItemFavoriteFunction = (value) => {
    setListItemFavorite(value);
  };

  const [listItemCart, setListItemCart] = useState([]);
  console.log(listItemCart);
  const [countItem, setCountItem] = useState(0); // count of list cart
  // checkout payment
  const [coupon, setCoupon] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  // order on payment
  const [order, setOrder] = useState(null);
  const setOrderFunction = (value) => {
    setOrder(value);
  };

  // total price
  const totalPrice = (list) => {
    if (!Array.isArray(list)) return Number(0).toFixed(2);
    let total = 0;
    list.forEach((entry) => {
      const item = entry?.item ? entry.item : entry;
      if (!item) return;
      const qty = Number(item.quantity ?? item.qty ?? 0);
      const price = Number(item.unitPrice ?? item.price ?? 0);
      total += qty * price;
    });
    return total.toFixed(2);
  };
  // total item
  const totalItem = (list) => {
    if (!Array.isArray(list)) return 0;
    // sum quantities for each entry (support wrapped entries or plain items)
    let total = 0;
    list.forEach((entry) => {
      const item = entry?.item ? entry.item : entry;
      if (!item) return;
      const qty = Number(item.quantity ?? item.qty ?? 1);
      if (!Number.isNaN(qty)) total += qty;
    });
    return total;
  };

  return (
    <StoreContext.Provider
      value={{
        setIsOnClickFunction,
        isOnclick,
        userInfo,
        setUserInfo,
        // favorite
        handleFavoriteItem,
        listItemFavorite,
        setListItemFavoriteFunction,
        countItemFavor,
        setCountItemFavorFunction,
        // cart
        listItemCart,
        setListItemCart,
        totalPrice,
        totalItem,
        countItem,
        setCountItem,
        coupon,
        setCoupon,
        currentTab,
        setCurrentTab,
        order,
        setOrderFunction
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
