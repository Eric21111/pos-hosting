const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const uri = process.env.MONGODB_URI;

async function checkVoidLogs() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const VoidLog = require('./models/VoidLog');
        const count = await VoidLog.countDocuments();
        console.log(`Total Void Logs: ${count}`);

        if (count > 0) {
            const logs = await VoidLog.find().sort({ voidedAt: -1 }).limit(5);
            console.log(JSON.stringify(logs, null, 2));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkVoidLogs();
