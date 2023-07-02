const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Please enter your product name!"],
    },
    description:{
        type:String,
        required:[true, "Please enter your product Description!"],
    },
    category:{
        type:String,
        required:[true, "Please enter your product category!"],
    },
    tags:{
        type:String,
        required:[true, "Please enter your product tags!"],
    },
    originalPrice:{
        type:Number,
       
    },
    discountPrice:{
        type:Number,
        required:[true, "Please enter your Product Price!"],
    },
    stock:{
        type:Number,
        required:[true, "Please enter your product Stock!"],
    },
    images:[
        {
            type:String,
            required:[true, "Please enter your product Pictures!"],
        },
    ],
    reviews:[
         {
           user:{
            type:Object
           },
           rating:{
            type:Number,
           },
           comment:{
            type:String,
           },
           productId:{
            type: String,
           },
           createdAt:{
            type:Date,
            default:Date.now(),
           },
         }
    ],
    ratings:{
        type: Number,
    },
    shopId:{
        type:String,
        required:true,
    },
    shop:{
        type:Object,
        required:true,
    },
    sold_out:{
        type:Number,
        default:0,
    },
    createdAt:{
        type:Date,
        default:Date.now(),
    }
});

module.exports = mongoose.model("Product", productSchema);