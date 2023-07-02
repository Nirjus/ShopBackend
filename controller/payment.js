const express = require("express");
const catchAsyncError = require("../middleware/catchAsyncError");
const router = express.Router();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.post("/process", catchAsyncError(async (req,res,next) => {
    const myPayment = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: "inr",
        metadata:{
            company: "Nirjusco",
        },
    });
 res.status(201).json({
    success: true,
    client_secret: myPayment.client_secret,
 })
}
)
 
)

router.get("/stripeapikey", catchAsyncError(async(req, res, next) => {
    
    res.status(200).json({
        stripeApikey: process.env.STRIPE_API_KEY
    })
}))

module.exports = router;