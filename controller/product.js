const express = require("express");
const router = express.Router();
const Product = require("../model/product");
const cloudinary = require("cloudinary");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const Shop = require("../model/shop");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
//create  Product
router.post(
  "/create-product",
  catchAsyncError(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid", 400));
      } else {
        let images = [];

        if (typeof req.body.images === "string") {
          images.push(req.body.images);
        } else {
          images = req.body.images;
        }

        const imagesLinks = [];

        for (let i = 0; i < images.length; i++) {
          const result = await cloudinary.v2.uploader.upload(images[i], {
            folder: "products",
          });

          imagesLinks.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
        }
        const productData = req.body;
        productData.images = imagesLinks;
        productData.shop = shop;

        const product = await Product.create(productData);

        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

//     get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncError(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

//       delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return next(new ErrorHandler("Product not found with thid Id", 404));
      }

      for (let i = 0; i < product.images.length; i++) {
        const result = await cloudinary.v2.uploader.destroy(
          product.images[i].public_id
        );
      }

      await product.deleteOne();

      res.status(201).json({
        success: true,
        message: "Product Deleted Successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products
router.get(
  "/get-all-products",
  catchAsyncError(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncError(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };
      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );
      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }
      let avg = 0;
      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        {
          $set: { "cart.$[elem].isReviewed": true },
        },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviewd successfull!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

//    all  Products -- fro Admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.put(
  "/update-product/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const {name,description,category,tags,originalPrice,discountPrice,stock,images,shopId} = req.body;
      const product = await Product.findById(req.params.id);
      const shop = await Shop.findById(shopId);
        
      if (!product) {
        return next(new ErrorHandler("Product not found with thid Id", 404));
      }
      const updates = {};
      updates.shop = shop;
      if(name){
        updates.name = name;
      }
      if(description){
        updates.description = description;
      }
      if(category){
        updates.category = category;
      }
      if(tags){
        updates.tags = tags;
      }
      if(originalPrice){
        updates.originalPrice = originalPrice;
      }
      if(discountPrice){
        updates.discountPrice = discountPrice;
      }
      if(stock){
        updates.stock = stock;
      }
      if(images){
        const myCloud = await cloudinary.v2.uploader.upload(images,{
          folder:"products"
        })
        const newImage = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url
      };
  
        updates.images = [...product.images, newImage];
      }
       
      const updatedProduct = await Product.findByIdAndUpdate(req.params.id,updates,{new:true});
      if(!updatedProduct){
        return next(new ErrorHandler("Product not updated successfully", 404));
      }

     res.status(201).json({
      success: true,
      message: "Product updated successfully",
      updatedProduct
     })
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.put("/delete-product-image/:id",
isSeller,
catchAsyncError(async (req, res, next) => {
  try {
    const {index} = req.body;
    const product = await Product.findById(req.params.id);

      if(index >=0 && index < product.images.length){
        if(product.images[index]){
          await cloudinary.v2.uploader.destroy(product.images[index].public_id);
  
          product.images.splice(index,1);
          await product.save();
        }else{
          return next(new ErrorHandler("Image did not exists",500));
        }
      }else{
        return next(new ErrorHandler("Index not found", 500));
      }
      res.status(201).json({
        success: true,
        message: "Image deleted successfully",
      })

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
})
)

module.exports = router;
