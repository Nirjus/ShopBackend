const express = require("express");
const ErrorHandler = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"https://shop-app-s8q6.vercel.app",
    credentials:true,
}));
app.use("/",express.static(path.join(__dirname,"./uploads")));
app.use("/test", (req, res) => {
    res.send("Backend Running");
});
app.use(bodyParser.urlencoded({extended:true, limit: "50mb"}));



if(process.env.NODE_ENV !== "PRODUCTION"){
    require("dotenv").config({
        path:"config/.env"
    })
}
// import Route
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const event = require("./controller/event");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const conversation = require("./controller/conversation");
const message = require("./controller/messages");
const withdraw = require("./controller/withdraw");


app.use("/api/v2/user",user);
app.use("/api/v2/order",order);
app.use("/api/v2/shop",shop);
app.use("/api/v2/product",product);
app.use("/api/v2/event",event);
app.use("/api/v2/coupon",coupon);
app.use("/api/v2/payment",payment);
app.use("/api/v2/conversation",conversation);
app.use("/api/v2/message",message);
app.use("/api/v2/withdraw",withdraw);

//This for error handelers
app.use(ErrorHandler);



module.exports = app;