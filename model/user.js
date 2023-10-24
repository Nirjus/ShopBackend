const mongoose = require("mongoose");

const bcrypt = require("bcrypt");
const bcryptJS = require("bcryptjs");

const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({

    name:{
        type: String,
        required: [true, "Please enter your name!"],
      },
      email:{
        type: String,
        required: [true, "Please enter your email!"],
      },
      password:{
        type: String,
        required: [true, "Please enter your password"],
        minLength: [4, "Password should be greater than 4 characters"],
        select: false,
      set: (v) => bcryptJS.hashSync(v, bcryptJS.genSaltSync(10)),
      },
      phoneNumber:{
        type: Number,
      },
      addresses:[
        {
          country: {
            type: String,
          },
          city:{
            type: String,
          },
          address1:{
            type: String,
          },
          address2:{
            type: String,
          },
          zipCode:{
            type: Number,
          },
          addressType:{
            type: String,
          },
        }
      ],
      role:{
        type: String,
        default: "user",
      },
      avatar:{
        public_id: {
          type:String,
          required: true,
        },
        url:{
          type:String,
          required: true,
        }
     },
     createdAt:{
      type: Date,
      default: Date.now(),
     },
     resetPasswordToken: String,
     resetPasswordTime: Date,
    });


  
  // jwt token
  userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id}, process.env.JWT_SECRET_KEY,{
      expiresIn: process.env.JWT_EXPIRES,
    });
  };
  
  // compare password
  userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

module.exports = mongoose.model("User",userSchema);