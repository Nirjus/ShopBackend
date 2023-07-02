const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err,req,res,next)=>{
    err.statusCode = err.statusCode || 500
    err.message = err.message || "Internal server error"

    // wrong mongodb Id error
    if(err.name === "CastError"){
        const message = `Resources not found with this id.. Invalid ${err.path}`;
        err = new ErrorHandler(message, 400);
    }
    // Duplicate key error
    if(err.code === 11000){
        const message = `Duplicate key ${Object.keys(err.keyValue)} Entered`;
        err = new ErrorHandler(message, 400);
    } 

    //wrong JWT token error
    if(err.name === "JsonWebTokenError"){
        const message = `Your url is invalid try again latter`;
        err= new ErrorHandler(message, 400);
    }

    //JWT Token expaired
    if(err.name === "TokenExpiredError"){
        const message = `Your Url is expired please try again latter`;
        err = new ErrorHandler(message, 400);
    }

    res.status(err.statusCode).json({
     success:false,
     message:err.message
    })
}