import React, { useContext, useEffect, useState } from "react";
import Header from "~/components/Header/Header";
import SubRoute from "./component/SubRoute";
import MainContentDetail from "./component/MainContentDetail";
import RelatedProduct from "./component/RelatedProduct";
import Footer from "~/components/Footer/Footer";
import { productService } from "~/apis/productService";
import { useParams } from "react-router-dom";
import { SearchContext } from "~/contexts/SearchProvider";
import BannerTimerCountdown from "~/components/BannerTimerCountdown/BannerTimerCountdown";
import bannerImage from "~/assets/images/detail/bannerDetailProduct.webp";

const DetailProduct = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const { setIsOpenSearchFunction } = useContext(SearchContext);

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsOpenSearchFunction(false);
    productService
      .getById(id)
      .then((res) => {
        console.log(res);
        setProduct(res.data.data);
      })
      .catch();
  }, [id]);

  // Fetch related products based on category
  useEffect(() => {
    if (product?.categoryCode) {
      productService
        .getAllProduct()
        .then((res) => {
          const allProducts = res?.data?.data || [];
          // Filter products with same categoryCode, exclude current product, limit to 4
          const related = allProducts
            .filter(
              (p) =>
                p.categoryCode === product.categoryCode &&
                (p._id || p.productCode) !==
                  (product._id || product.productCode)
            )
            .slice(0, 4);
          setRelatedProducts(related);
        })
        .catch((err) => console.log("Error fetching related products:", err));
    }
  }, [product]);

  return (
    <>
      {/* header */}
      <section>
        <Header />
      </section>

      {/* banner */}
      <section>
        <div className="md:h-[380px] border">
          <BannerTimerCountdown
            targetDate={"2030-12-21"}
            title={"Bringing Books & Readers Together"}
            btnContent={"Explore Now"}
            bannerImg={bannerImage}
          />
        </div>
      </section>

      {/* sub route */}
      <section className="container mt-5">
        <SubRoute />
      </section>
      {/* main content */}
      {product && (
        <section className="container mt-20 px-3 xl:px-0">
          <MainContentDetail product={product} />
        </section>
      )}

      {/* related product */}
      <section className="container mt-20 px-3 xl:px-0">
        <RelatedProduct relativeProduct={relatedProducts} />
      </section>

      {/* footer */}
      <section className="mt-28">
        <Footer />
      </section>
    </>
  );
};

export default DetailProduct;
