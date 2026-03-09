const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;

async function check() {
    let output = '';
    const log = (msg) => { console.log(msg); output += msg + '\n'; };

    try {
        await mongoose.connect(uri);
        log('Connected!');

        const Product = require('./models/Product');
        const SalesTransaction = require('./models/SalesTransaction');
        const StockMovement = require('./models/StockMovement');
        const VoidLog = require('./models/VoidLog');

        const productCount = await Product.countDocuments();
        const txnCount = await SalesTransaction.countDocuments();
        const movementCount = await StockMovement.countDocuments();
        const voidLogCount = await VoidLog.countDocuments();

        log(`Products: ${productCount}`);
        log(`Transactions: ${txnCount}`);
        log(`Stock Movements: ${movementCount}`);
        log(`Void Logs: ${voidLogCount}`);

        if (txnCount > 0) {
            const txns = await SalesTransaction.find().sort({ createdAt: -1 }).limit(5);
            log('--- Last 5 Transactions ---');
            txns.forEach(t => {
                log(`ID: ${t._id}, Created: ${t.createdAt}, Amount: ${t.totalAmount}`);
            });
        }

        if (movementCount > 0) {
            const movs = await StockMovement.find().sort({ createdAt: -1 }).limit(5);
            log('--- Last 5 Stock Movements ---');
            movs.forEach(m => {
                log(`ID: ${m._id}, Created: ${m.createdAt}, Type: ${m.type}, Qty: ${m.quantity}`);
            });
        }

        if (voidLogCount > 0) {
            const voids = await VoidLog.find().sort({ voidedAt: -1 }).limit(5);
            log('--- Last 5 Void Logs ---');
            voids.forEach(v => {
                log(`ID: ${v.voidId}, Date: ${v.voidedAt}, By: ${v.voidedByName}, Total: ${v.totalAmount}`);
            });
        }

        fs.writeFileSync('db_check_result.txt', output);
        console.log('Output written to db_check_result.txt');

    } catch (err) {
        console.error('Error:', err);
        fs.writeFileSync('db_check_result.txt', 'Error: ' + err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

check();
