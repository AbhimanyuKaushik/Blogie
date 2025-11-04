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
  following:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
  }],
  followers:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
  }]
});

UserSchema.pre("save",async function(next){
  this.password =  await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", UserSchema);