

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const escpos = require('escpos');

let BluetoothAdapter;
try {
  BluetoothAdapter = require('escpos-bluetooth');
  escpos.Bluetooth = BluetoothAdapter;
} catch (error) {
  console.warn('[printService] escpos-bluetooth not available:', error.message);
}

let bluetoothSerialPort;
try {
  bluetoothSerialPort = require('bluetooth-serial-port');
} catch (error) {
  console.warn('[printService] bluetooth-serial-port fallback not available:', error.message);
}

const DEFAULT_BT_ADDRESS = process.env.PRINTER_BT_ADDRESS || '00:00:00:00:00:00';
const DEFAULT_BT_CHANNEL = Number(process.env.PRINTER_BT_CHANNEL || 1);
const MAX_LINE_CHARS = Number(process.env.PRINTER_LINE_CHARS || 32); // 58 mm 

// Format currency for receipt
const formatCurrency = value => `PHP ${Number(value || 0).toFixed(2)}`;

// Pad line with left and right text
const padLine = (left, right = '') => {
  const cleanLeft = String(left ?? '').trim();
  const cleanRight = String(right ?? '').trim();
  const available = MAX_LINE_CHARS - (cleanLeft.length + cleanRight.length);
  const spacer = available > 0 ? ' '.repeat(available) : ' ';
  return (cleanLeft + spacer + cleanRight).slice(0, MAX_LINE_CHARS);
};

// Build receipt lines from receipt object (matching frontend printBridge.js format)
const buildReceiptLines = receipt => {
  const lines = [];
  const storeName = receipt.storeName || 'Create Your Style';
  const contactNumber = receipt.contactNumber || '+631112224444';
  const location = receipt.location || 'Pasonanca, Zamboanga City';
  const issueTime = receipt.time || '12:00PM';
  const referenceNo = receipt.referenceNo || receipt.reference || '-';

  // Header
  lines.push(storeName);
  lines.push(padLine(issueTime, contactNumber));
  lines.push(location);
  lines.push('-'.repeat(MAX_LINE_CHARS));

  // Receipt No
  lines.push('Receipt No:');
  lines.push(`#${receipt.receiptNo || '000000'}`);
  lines.push('-'.repeat(MAX_LINE_CHARS));

  // Item table headers (Item: 20, Qty: 3, Price: 9 = 32 chars)
  const itemCol = 'Item'.padEnd(20);
  const qtyCol = 'Qty'.padStart(3);
  const priceCol = 'Price'.padStart(9);
  lines.push(`${itemCol}${qtyCol}${priceCol}`);
  lines.push('-'.repeat(MAX_LINE_CHARS));

  // Items
  (receipt.items || []).forEach(item => {
    const itemName = (item.name || item.itemName || 'Item').toString();
    const qty = item.qty || item.quantity || 1;
    const price = item.price || item.itemPrice || 0;

    const itemNameLine = itemName.substring(0, 20).padEnd(20);
    const qtyStr = qty.toString().padStart(3);
    const priceStr = formatCurrency(price).padStart(9);
    lines.push(`${itemNameLine}${qtyStr}${priceStr}`);
  });

  lines.push('-'.repeat(MAX_LINE_CHARS));

  // Payment summary
  lines.push(padLine('Transaction/Reference', referenceNo));
  lines.push(padLine('Payment Method', receipt.paymentMethod || 'CASH'));
  lines.push(padLine('Subtotal', formatCurrency(receipt.subtotal || 0)));
  lines.push('-'.repeat(MAX_LINE_CHARS));
  lines.push(padLine('Discount', formatCurrency(receipt.discount || 0)));
  lines.push('-'.repeat(MAX_LINE_CHARS));
  lines.push(padLine('Total', formatCurrency(receipt.total || 0)));

  if (receipt.cash !== undefined) {
    lines.push(padLine('Cash', formatCurrency(receipt.cash)));
  }

  if (receipt.change !== undefined) {
    lines.push(padLine('Change', formatCurrency(receipt.change)));
  }

  lines.push('-'.repeat(MAX_LINE_CHARS));
  lines.push('This is not an official receipt');
  
  // Add cashier if available
  if (receipt.cashier) {
    lines.push(padLine('Cashier', receipt.cashier));
  }

  return lines;
};

const normalizeLines = rawLines => {
  const expandedLines = [];
  rawLines.forEach(line => {
    const text = String(line || '');
    if (text.length <= MAX_LINE_CHARS) {
      expandedLines.push(text);
      return;
    }
    for (let i = 0; i < text.length; i += MAX_LINE_CHARS) {
      expandedLines.push(text.slice(i, i + MAX_LINE_CHARS));
    }
  });
  return expandedLines;
};


const printViaEscpos = (lines, { address, channel }) =>
  new Promise((resolve, reject) => {
    if (!BluetoothAdapter) {
      return reject(new Error('escpos-bluetooth adapter missing'));
    }

    const device = new escpos.Bluetooth(address, channel);
    const printer = new escpos.Printer(device, { encoding: 'GB18030' });

    device.open(error => {
      if (error) {
        return reject(error);
      }

      try {
        lines.forEach(line => printer.text(line));
        printer.cut().close();
        resolve();
      } catch (printError) {
        reject(printError);
      }
    });
  });


const printViaBluetoothSerial = (lines, { address, channel }) =>
  new Promise((resolve, reject) => {
    if (!bluetoothSerialPort) {
      return reject(new Error('bluetooth-serial-port module missing'));
    }

    const btSerial = new bluetoothSerialPort.BluetoothSerialPort();
    const payload = Buffer.from(`${lines.join('\n')}\n\n`, 'ascii');

    const connect = targetChannel => {
      btSerial.connect(
        address,
        targetChannel,
        () => {
          btSerial.write(payload, err => {
            if (err) {
              return reject(err);
            }
            btSerial.close();
            resolve();
          });
        },
        err => reject(err)
      );
    };

    if (channel) {
      connect(channel);
      return;
    }

    btSerial.findSerialPortChannel(
      address,
      discoveredChannel => connect(discoveredChannel),
      err => reject(err || new Error('Unable to locate printer channel'))
    );
  });

async function handlePrint(lines, config) {
  try {
    await printViaEscpos(lines, config);
  } catch (error) {
    console.warn('[printService] escpos-bluetooth failed, trying fallback:', error.message);
    await printViaBluetoothSerial(lines, config);
  }
}

function startPrintServer({
  port = 3000,
  printerAddress = DEFAULT_BT_ADDRESS,
  printerChannel = DEFAULT_BT_CHANNEL
} = {}) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/print', async (req, res) => {
    const body = req.body || {};
    let lines;

    // Check if this is a receipt object (has storeName or items) or direct lines array
    if (body.storeName || body.items || body.receiptNo) {
      // Receipt object format - build lines from it
      lines = buildReceiptLines(body);
    } else if (Array.isArray(body.lines) && body.lines.length > 0) {
      // Direct lines array format (backward compatibility)
      lines = body.lines;
    } else {
      return res.status(400).json({ message: 'Receipt object or `lines` array is required' });
    }

    try {
      await handlePrint(
        normalizeLines(lines),
        { address: printerAddress, channel: printerChannel }
      );
      res.json({ ok: true });
    } catch (error) {
      console.error('[printService] Failed to print:', error);
      res.status(500).json({ message: error.message });
    }
  });

  return new Promise((resolve, reject) => {
    const server = app
      .listen(port, () => {
        console.log(`[printService] Listening on http://localhost:${port}`);
        resolve(server);
      })
      .on('error', reject);
  });
}

module.exports = {
  startPrintServer
};

