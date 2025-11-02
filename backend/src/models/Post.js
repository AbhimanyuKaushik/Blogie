import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
    title:{
        type:String,
        required: true,
        trim: true
    },
    content:{
        type:String,
        reuired:true
    },
    author:{
        type:String,
        default:"Anonymous"
    },
    tags:{
        type:[String],
        default:[]
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

export default mongoose.model("Post",postSchema)