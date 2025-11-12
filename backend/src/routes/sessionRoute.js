const express = require("express")
const router = express.Router();

router.get("/",(req,res)=>{
    if (!req.session || !req.session.user){
        return res.status(200).json({message:"No active session found"});
    }
    res.status(200).json({
        message:"Current session",
        session:req.session
    });
});
module.exports = router;