const express = require("express")
const router = express.Router();
const User = require("../models/User")

//profile creation and fetching of existing one
router.post("/me",async (req,res) =>{
    try{
        const{userId,username,age,profileImage,bio,location,social} = req.body;
        let profile = await User.findOne({user:userId});
        if(profile){
            profile.profileImage = profileImage || profile.profileImage;
            profile.username = username || username.age;
            profile.age = age || profile.age;
            profile.bio = bio || profile.bio;
            profile.location = location || profile.location;
            profile.social = social || profile.social;
            await profile.save();
            return res.json({message:"Profile updated",profile})
        }
        const newProfile = new Profile({
            user:userId,
            bio,
            age,
            profileImage,            
            location,
            social,
        });
        await newProfile.save();
        res.status(201).json({message:"Profile created",profile:newProfile});
    } catch(err){
        console.error("Profile error:",err);
        res.status(500).json({error: err.essage});
    }
});

//
router.get("/me/:userId", async(req,res)=>{
    const profile = await User.findone({user:req.params.userId})
    .populate("user","username email");
    if(!profile)
        return res.status(404).json({message:"Profile not found"});
    res.json(profile);
})
module.exports = router;