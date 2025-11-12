const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    min: 0,
  },
  bio: {
    type: String,
    default: "",
  },
  profileImage: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  interests: {
    type: [String],
    default: [],
  },
  location:{
      type:String,
      default:"",
  },
  social:{
      instagram:{type:String,default:""},
      twitter:{type:String,default:""},
      linkedin:{type:String,default:""},
  },
  following:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
  }],
  followers:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
  }],
  savedPosts:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Post",
  }],
  savedCount: { 
    type: Number, 
    default: 0 
  },
});

UserSchema.pre("save",async function(next){
  this.password =  await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", UserSchema);