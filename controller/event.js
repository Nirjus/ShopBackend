const express = require("express");
const catchAsyncError = require("../middleware/catchAsyncError");
const Shop = require("../model/shop");
const cloudinary = require("cloudinary");
const Event = require("../model/event");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller, isAdmin, isAuthenticated } = require("../middleware/auth");
const router = express.Router();

//create  event
router.post(
    "/create-event",
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

        const event = await Event.create(productData);

  
          res.status(201).json({
            success: true,
            event,
          });
        }
      } catch (error) {
        return next(new ErrorHandler(error, 400));
      }
    })
  );


  // get all events
  router.get("/get-all-events", async(req,res,next) => {
    try {
      const events = await Event.find();
      res.status(201).json({
        success:true,
        events,
      })
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })

  //     get all events of a shop
router.get(
  "/get-all-events/:id",
  catchAsyncError(async (req, res, next) => {
    try {
      const events = await Event.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

//       delete event of a shop
router.delete(
  "/delete-shop-event/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const event = req.params.id;

      if (!event) {
        return next(new ErrorHandler("event not found with thid Id", 500));
      }  

      for (let i = 0; 1 < event.images.length; i++) {
        const result = await cloudinary.v2.uploader.destroy(
          event.images[i].public_id
        );
      }
    
      await event.remove();
      res.status(201).json({
        success: true,
        message:"Event Deleted Successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

//    all  Events -- fro Admin
router.get(
  "/admin-all-events",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const events = await Event.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
  module.exports = router;