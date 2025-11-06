const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const dotenv = require("dotenv");

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_TOKEN;
router.post("/register",async(req,res)=>{
    try{
        const{username,email,password} = req.body;
        const existingUser = await User.findOne({email});
        if(existingUser)
            return res.status(400).json({message:"User already exists"});
        const hashedPassword = await bcrypt.hashSync(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        res.status(201).json({message: "User registered successfully"});
    } catch(err){
        res.status(500).json({error:err.message});
    }
})

router.post("/login",async(req,res)=>{
    try{
        const{username,email,password} = req.body;
        req.session.user = username;
        const user = await User.findOne({email});
        if(!user) return res.status(401).json({message:"Invalid credentials"});
        const isMatch = await bcrypt.hashSync(password,user.password);
        if(!isMatch) return res.status(400).json({message:"Invalid credentials"});
        const token = jwt.sign(
            {id:user._id,username:user.username},
            JWT_SECRET,
            {expiresIn:'1h'}
        );
        
        res.json({message:"Logged in successfully",token,username:user.username});
    } catch (err){
        res.status(500).json({error:err.message});
    }
});



router.post("/logout",async(req,res)=>{
    req.session.destroy()
    return res.json({message:"Logged out"})
})


module.exports= router;