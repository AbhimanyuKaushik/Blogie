import express from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

router.post("/register",async(req,res)=>{
    try{
        const{username,email,password} = req.body;
        const existingUser = await User.findOne({email});
        if(existingUser)
            return res.status(400).json({message:"User already exists"});
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        res.status(201),json({message: "User registered successfully"});
    } catch(err){
        res.status(500).json({error:err.message});
    }
})