const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const Shop = require("../model/shop");
const catchAsyncError = require("../middleware/catchAsyncError");
const sendShopToken = require("../utils/shopToken");

// create-shop
router.post("/create-shop", catchAsyncError(async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {

      return next(new ErrorHandler("User already exists", 400));
    }
      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
      })

    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: {
        public_id:myCloud.public_id,
        url:myCloud.secure_url,
      },
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
    };

    const activationToken = createActivationToken(seller);
    const activationUrl = `https://shop-app-s8q6.vercel.app/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        html: `Hello ${seller.name}, please click to the link to activate your Shop: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please ckeck your email:- ${seller.email} to activate your shop`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}));

//create activation token
const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

//activate user

router.post(
  "/activation",
  catchAsyncError(async (req, res, next) => {
    try {
      const { activation_token } = req.body;
      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      const { name, email, password, avatar, zipCode, address, phoneNumber } =
        newSeller;

      let seller = await Shop.findOne({ email });
      if (seller) {
        return next(new ErrorHandler("User already exists", 400));
      }
      seller = await Shop.create({
        name,
        email,
        avatar,
        password,
        zipCode,
        address,
        phoneNumber,
      });
      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Login into Shop

router.post(
  "/login-shop",
  catchAsyncError(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandler("please provide the all fields!", 400));
      }
      const user = await Shop.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User does not exists", 400));
      }
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("please provide the correct information", 400)
        );
      }
      sendShopToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Load Shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler(error.message, 500));
      }
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// LOgout Shop
router.get(
  "/logout",

  catchAsyncError(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });

      res.status(201).json({
        success: true,
        message: "Log Out Successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//get Shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncError(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//      update shop profile picture

router.put(
  "/update-shop-avatar",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      let existsSeller = await Shop.findById(req.seller._id);
     
      const imageId = existsSeller.avatar.public_id;

      await cloudinary.v2.uploader.destroy(imageId);

      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder:"avatars",
        width:150,
      })

      existsSeller.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      }

      await existsSeller.save();

      res.status(200).json({
        success: true,
        seller: existsSeller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller information
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode } = req.body;

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("user not found", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.zipCode = zipCode;
      shop.phoneNumber = phoneNumber;
      await shop.save();

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
//  forget password
router.post("/forgot-password",
catchAsyncError(async (req, res, next) => {
  try {
    const {email} = req.body;
    const seller = await Shop.findOne({email: email});
    if(!seller){
      return next(new ErrorHandler("Seller not found with this email", 400));
    }
    
    const token = createActivationToken({seller});
    
    const emaildata = {
      email: seller.email,
      subject: "Forget password email",
      html: `
      <h1> Hey ${seller.name}, </h1> 
     <h3> if you want to reset your password , click this link bellow.</h3>
      <br/>
     <h3> <a href="http://localhost:3000/shop/reset-password/${token}" target="_blank">click!</a> </h3>
      `
    }
    await sendMail(emaildata);

    res.status(200).json({
      success: true,
      message: `please go to your ${seller.email} email to reset your password`,
    })
  } catch (error) {
    return next(new ErrorHandler(error.message,500));
  }
})
)
// reset password 
router.put("/reset-password", catchAsyncError(async (req, res, next) => {
  try {
       const {token,password} = req.body;
       const decoded = jwt.verify(token,
        process.env.ACTIVATION_SECRET);

        if(!decoded){
          return next(new ErrorHandler("Jwt not found!",400));
        }
        
      const seller = await Shop.findById(decoded.seller._id).select("+password");
     
      seller.password = password;
      await seller.save();
        
      res.status(201).json({
        success: true,
        message: "Password reset successfull",
        seller,
      })
  } catch (error) {
    return next(new ErrorHandler(error.message,500));
  }
}))

//    all  sellers -- fro Admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//   delete sellers by -- Admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);
      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }
      const imageId = seller.avatar.public_id;

      await cloudinary.v2.uploader.destroy(imageId);

      await Shop.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller Deleted Successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//    seller withdraw methods -- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });
      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//       delete  seller  withdraw  method  -- seller
router.delete(
  "/delete-withdraw-method",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

       if(!seller){
        return next(new ErrorHandler("seller not found with this Id", 400))
       }
       seller.withdrawMethod = null;

       await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
module.exports = router;
