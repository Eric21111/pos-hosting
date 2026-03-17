const express = require("express");
const router = express.Router();
const {
    getGlobalSettings,
    updateGlobalSettings,
} = require("../controllers/globalSettingsController");

// GET /api/global-settings
router.get("/", getGlobalSettings);

// PUT /api/global-settings
router.put("/", updateGlobalSettings);

module.exports = router;
