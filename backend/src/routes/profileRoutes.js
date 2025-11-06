const express = require("express")
const router = express.Router();

const Profile = require("../models/Profile")
const User = require("../models/User")

router.post("/profile",async (req,res) =>{
    try{
        const{userId,bio,location,social} = req.body;
        let profile = await Profile.findOne({user:userId});
        if(profile){
            profile.bio = bio || profile.bio;
            profile.location = location || profile.location;
            profile.social = social || profile.social;
            await profile.save();
            return res.json({message:"Profile updated",profile})
        }
        const newProfile = new Profile({
            user:userId,
            bio,
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

router.get("/profile/:userId", async(req,res)=>{
    const profile = await Profile.findone({user:req.params.userId})
    .populate("user","username email");
})
module.exports = router;
