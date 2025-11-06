const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        unique:true,
    },
    bio:{
        type:String,
        default:"",
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
},
{timestamps:true}
);

module.exports = mongoose.model("Profile",profileSchema);