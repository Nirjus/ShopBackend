const express = require("express");
const router = express.Router();
const Order = require("../model/order");
const Product = require("../model/product");
const catchAsyncError = require("../middleware/catchAsyncError");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const ErrorHandler = require("../utils/ErrorHandler");
const Shop = require("../model/shop");

//     create order
router.post(
  "/create-order",
  catchAsyncError(async (req, res, next) => {
    try {
      const { cart, shippingAddress, user, totalPrice, paymentInfo } = req.body;

      //     group  cart    items     by    shopId
      const shopItemsMap = new Map();

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);
      }

      //       create    an    order    for   each    shop
      const orders = [];

      for (const [shopId, items] of shopItemsMap) {
        const order = await Order.create({
          cart: items,
          shippingAddress,
          user,
          totalPrice,
          paymentInfo,
        });
        orders.push(order);
      }
      try {
        await sendMail({
          email: user.email,
          subject: "Your Order hasbeen placed",
          html: `
          <div style="background-color: #D2C7BA; width:100%; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
          <img src="https://res.cloudinary.com/dux3nrcwg/image/upload/v1693261817/shopLogo_1_yalmlu.png" alt="Logo" style="width:100px; height:20%; margin:5px;"/>
          <div style="background-color: #fff; width:80%; height:80%;">
          Hey you ${user.name} your order is confirmed, it will take 2 days to 3 days for delevary
          ${orders.map(order => `
          <h3 style="background-color: #e8e7e5">Order ID: ${order._id}</h3>
          <ul>
            ${order.cart.map(item => `<li>${item.name}  ---->  $${item.discountPrice}*${item.qty}</li>`).join('')}
          </ul>
          <p>Total Price: $${order.cart.reduce((total, item) => total + item.discountPrice * item.qty, 0)}</p>
        `).join('')}
          
          </div>
          </div>
          `
        });
        res.status(201).json({
          success: true,
          message: `please ckeck your email:- ${user.email} for invoice Receipt`,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
      
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//       get    all   order   of    user
router.get(
  "/get-all-orders/:userId",
  catchAsyncError(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//    get    all     orders     of     seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncError(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//     update   order    status    for    seller

router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      if (req.body.status === "Tranferred to delivery partner") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      order.status = req.body.status;

      if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";
        const serviceCharge = order.totalPrice * 0.1;
        await updateSellerInfo(order.totalPrice - serviceCharge);
      }
      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
      });
      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock -= qty;
        product.sold_out += qty;

        await product.save({ validateBeforeSave: false });
      }
      async function updateSellerInfo(amount) {
        const seller = await Shop.findById(req.seller.id);

        seller.availableBalance = amount;

        await seller.save();
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//    give a refund  --  user
router.put(
  "/order-refund/:id",
  catchAsyncError(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Order Refund request successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//    accept  the  refund  --seller
router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this Id", 400));
      }

      order.status = req.body.status;

      await order.save();

      res.status(200).json({
        success: true,
        message: "Order Refund successful!",
      });
      if (req.body.status === "Refund Success") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }
      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock += qty;
        product.sold_out -= qty;

        await product.save({ validateBeforeSave: false });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//  All orders -- Admin
router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
