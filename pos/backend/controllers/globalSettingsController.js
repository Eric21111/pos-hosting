const GlobalSettings = require("../models/GlobalSettings");

// GET /api/global-settings
exports.getGlobalSettings = async (req, res) => {
    try {
        let settings = await GlobalSettings.findOne();
        if (!settings) {
            settings = await GlobalSettings.create({});
        }
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error("Error fetching global settings:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PUT /api/global-settings
exports.updateGlobalSettings = async (req, res) => {
    try {
        const { openingFloat } = req.body;
        let settings = await GlobalSettings.findOne();
        if (!settings) {
            settings = await GlobalSettings.create({ openingFloat: openingFloat || 2000 });
        } else {
            if (openingFloat !== undefined) settings.openingFloat = openingFloat;
            await settings.save();
        }
        res.json({ success: true, data: settings, message: "Settings updated successfully" });
    } catch (error) {
        console.error("Error updating global settings:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
