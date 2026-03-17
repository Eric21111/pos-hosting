const mongoose = require("mongoose");

const globalSettingsSchema = new mongoose.Schema(
    {
        storeName: {
            type: String,
            default: "Create Your Style",
        },
        openingFloat: {
            type: Number,
            default: 2000,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("GlobalSettings", globalSettingsSchema);
