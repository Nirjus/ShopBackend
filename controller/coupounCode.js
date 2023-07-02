const express = require("express");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const CoupounCode = require("../model/coupounCode");
const { isSeller } = require("../middleware/auth");
const router = express.Router();

//    create coupoun code

router.post(
  "/create-coupoun-code",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const isCoupounCodeExists = await CoupounCode.find({
        name: req.body.name,
      });

      if (isCoupounCodeExists.length !== 0) {
        return next(new ErrorHandler("Coupoun code already exists!", 400));
      }
      const coupounCode = await CoupounCode.create(req.body);

      res.status(201).json({
        success: true,
        coupounCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

//        get all coupon code of a shop

router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const couponCodes = await CoupounCode.find({
       shopId: req.seller.id
      });

      res.status(201).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


//    delete coupon code of a shop

router.delete("/delete-coupon/:id", isSeller, catchAsyncError(async (req,res,next) => {

  try {
      const couponCode = await CoupounCode.findByIdAndDelete(req.params.id);
      if(!couponCode){
        return next(new ErrorHandler("Coupon code doesn't exists!",400));
      }

      res.status(201).json({
        success: true,
        message: "Coupon code deleted successfully!",
      })
  } catch (error) {
      return next(new ErrorHandler(error,400))
  }
}))
//      get coupon code value by its name
router.get("/get-coupon-value/:name", catchAsyncError(async (req, res, next) => {
  try {
      const couponCode = await CoupounCode.findOne({name:req.params.name});

      res.status(200).json({
        success:true,
        couponCode,
      })
  } catch (error) {
    return next(new ErrorHandler(error, 400));

  }
}))

module.exports = router;
