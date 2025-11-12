import React, { useEffect, useState } from "react";
import { productService } from "~/apis/productService";
import Product from "~/components/Product/Product";

const Suggest = () => {
  const [listProduct, setListProduct] = useState([]);
  useEffect(() => {
    productService
      .getAllProduct()
      .then((res) => {
        // Normalize response to an array. Some APIs return { data: [...] } or { items: [...] }
        const payload = res && res.data ? res.data : res;
        if (Array.isArray(payload)) setListProduct(payload);
        else if (payload && Array.isArray(payload.data))
          setListProduct(payload.data);
        else if (payload && Array.isArray(payload.items))
          setListProduct(payload.items);
        else setListProduct([]);
      })
      .catch();
  }, []);
  return (
    <div className="px-5 xl:px-0 mt-20 container flex flex-col space-y-5 mb-40">
      <h2 className="text-2xl font-bold text-center">See More</h2>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {(Array.isArray(listProduct) ? [...listProduct] : [])
          .sort(() => Math.random() - 0.5) // shuffle
          .slice(0, 4) // take 4
          .map((item, index) => (
            <Product key={item?.productCode || index} item={item} />
          ))}
      </div>
    </div>
  );
};

export default Suggest;
