const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const statsController = require("../controllers/statsController");

router.get("/creator", auth, statsController.getAuthorStats);

module.exports = router;