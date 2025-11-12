import React from "react";
import Product from "~/components/Product/Product";

const RelatedProduct = ({ relativeProduct }) => {
  return (
    <div>
      <h2 className="text-3xl text-center">Related Products</h2>
      <div className="flex flex-wrap xl:flex-nowrap gap-5 mt-5">
        {relativeProduct?.map((item) => (
          <Product item={item} addCartBtn={true} />
        ))}
      </div>
    </div>
  );
};

export default RelatedProduct;
