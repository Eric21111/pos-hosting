const fs = require('fs');

const code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');
const lines = code.split('\n');

const newCode = `exports.getInventoryAnalytics = async (req, res) => {
  try {
    const {
      timeframe = 'daily',
      startDate: customStart,
      endDate: customEnd,
    } = req.query;
    const { start, end } = getDateRange(timeframe, customStart, customEnd);

    // ── 1. Fetch aggregated product stats ──
    const productStatsData = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          inventoryValue: { $sum: { $multiply: [{ $ifNull: ['$itemPrice', 0] }, { $ifNull: ['$currentStock', 0] }] } },
          costValue: { $sum: { $multiply: [{ $ifNull: ['$costPrice', 0] }, { $ifNull: ['$currentStock', 0] }] } },
          totalStockUnits: { $sum: { $max: [{ $ifNull: ['$currentStock', 0] }, 0] } },
          inStockCount: {
            $sum: { $cond: [{ $gt: [{ $ifNull: ['$currentStock', 0] }, { $max: [{ $ifNull: ['$reorderNumber', 0] }, 10] }] }, 1, 0] }
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: [{ $ifNull: ['$currentStock', 0] }, 0] },
                    { $lte: [{ $ifNull: ['$currentStock', 0] }, { $max: [{ $ifNull: ['$reorderNumber', 0] }, 10] }] }
                  ]
                }, 1, 0
              ]
            }
          },
          outOfStockCount: {
            $sum: { $cond: [{ $lte: [{ $ifNull: ['$currentStock', 0] }, 0] }, 1, 0] }
          }
        }
      }
    ]);
    
    const pStats = productStatsData[0] || {
      totalItems: 0, inventoryValue: 0, costValue: 0, totalStockUnits: 0,
      inStockCount: 0, lowStockCount: 0, outOfStockCount: 0
    };

    // ── 2. Fetch aggregated transactions ──
    const transactionsData = await SalesTransaction.aggregate([
      {
        $match: {
          $or: [
            { checkedOutAt: { $gte: start, $lte: end } },
            { checkedOutAt: { $exists: false }, createdAt: { $gte: start, $lte: end } }
          ],
          status: { $not: { $regex: /^voided$/i } },
          paymentMethod: { $ne: 'return' },
        }
      },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          date: { $first: { $ifNull: ['$checkedOutAt', '$createdAt'] } },
          totalAmount: { $first: '$totalAmount' },
          cogs: {
            $sum: { $multiply: [ { $ifNull: ['$productInfo.costPrice', 0] }, { $ifNull: ['$items.quantity', 1] } ] }
          },
          unitsSold: { $sum: { $ifNull: ['$items.quantity', 1] } }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          date: { $first: '$date' },
          revenue: { $sum: '$totalAmount' },
          cogs: { $sum: '$cogs' },
          unitsSold: { $sum: '$unitsSold' },
          transactionsCount: { $sum: 1 }
        }
      }
    ]);

    let totalSales = 0, totalTransactions = 0, totalUnitsSold = 0, cogs = 0;
    transactionsData.forEach(t => {
      totalSales += t.revenue || 0;
      totalTransactions += t.transactionsCount || 0;
      totalUnitsSold += t.unitsSold || 0;
      cogs += t.cogs || 0;
    });
    
    const totalProfit = totalSales - cogs;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    // ── 3. Fetch aggregated stock movements ──
    const movementsData = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          date: { $first: '$createdAt' },
          type: { $first: '$type' },
          quantity: { $sum: { $abs: '$quantity' } }
        }
      }
    ]);

    let stockInCount = 0, stockOutCount = 0, pullOutCount = 0;
    movementsData.forEach(m => {
      if (m.type === 'Stock-In') stockInCount += m.quantity;
      else if (m.type === 'Stock-Out') stockOutCount += m.quantity;
      else if (m.type === 'Pull-Out') pullOutCount += m.quantity;
    });

    // ── 4. Build Inventory Analysis chart data ──
    const inventoryChartData = buildTimeSeriesData(movementsData, timeframe, start, end);

    // ── 5. Build Profit Analysis chart data ──
    const profitChartData = buildProfitChartData(transactionsData, timeframe, start, end);

    // ── 6. Damaged & Expired stock data ──
    const damagedExpiredMovements = await StockMovement.find({
      createdAt: { $gte: start, $lte: end },
      reason: { $in: ['Damaged', 'Expired', 'Lost'] }
    }).sort({ createdAt: -1 }).limit(20).lean();

    const formattedDamaged = damagedExpiredMovements.map((m) => ({
      itemName: m.itemName || 'Unknown',
      sku: m.sku || '-',
      category: m.category || '-',
      type: m.reason,
      quantity: Math.abs(m.quantity),
      date: m.createdAt,
      handledBy: m.handledBy || 'Unknown',
      notes: m.notes || '',
    }));

    const damagedTotals = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, reason: { $in: ['Damaged', 'Expired', 'Lost'] } } },
      { $group: { _id: '$reason', total: { $sum: { $abs: '$quantity' } } } }
    ]);
    
    let damagedTotal = 0, expiredTotal = 0, lostTotal = 0;
    damagedTotals.forEach(d => {
      if (d._id === 'Damaged') damagedTotal = d.total;
      if (d._id === 'Expired') expiredTotal = d.total;
      if (d._id === 'Lost') lostTotal = d.total;
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalSales,
          totalTransactions,
          totalUnitsSold,
          cogs,
          totalProfit,
          profitMargin: Math.round(profitMargin * 100) / 100, // Fixed the Math.round here
          inventoryValue: pStats.inventoryValue,
          costValue: pStats.costValue,
          totalStockUnits: pStats.totalStockUnits,
        },
        stats: {
          totalItems: pStats.totalItems,
          inStockCount: pStats.inStockCount,
          lowStockCount: pStats.lowStockCount,
          outOfStockCount: pStats.outOfStockCount,
          stockInCount,
          stockOutCount,
          pullOutCount,
        },
        inventoryChartData,
        profitChartData,
        damagedExpired: {
          items: formattedDamaged,
          summary: {
            damaged: damagedTotal,
            expired: expiredTotal,
            lost: lostTotal,
            total: damagedTotal + expiredTotal + lostTotal,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory analytics',
      error: error.message,
    });
  }
};

/**
 * Build time series data for stock movements (Stock-In vs Stock-Out vs Pull-Out)
 */
function buildTimeSeriesData(aggregatedMovements, timeframe, start, end) {
  const buckets = generateBuckets(timeframe, start, end);

  aggregatedMovements.forEach((m) => {
    const date = new Date(m.date);
    const bucketKey = getBucketKey(date, timeframe, buckets);
    const bucket = buckets.find((b) => b.key === bucketKey);
    if (bucket) {
      if (m.type === 'Stock-In') bucket.stockIn += m.quantity;
      else if (m.type === 'Stock-Out') bucket.stockOut += m.quantity;
      else if (m.type === 'Pull-Out') bucket.pullOut += m.quantity;
    }
  });

  return buckets.map((b) => ({
    period: b.label,
    stockIn: b.stockIn,
    stockOut: b.stockOut,
    pullOut: b.pullOut,
  }));
}

/**
 * Build time series data for profit analysis (Revenue, COGS, Profit)
 */
function buildProfitChartData(aggregatedTransactions, timeframe, start, end) {
  const buckets = generateBuckets(timeframe, start, end);

  aggregatedTransactions.forEach((txn) => {
    const date = new Date(txn.date);
    const bucketKey = getBucketKey(date, timeframe, buckets);
    const bucket = buckets.find((b) => b.key === bucketKey);
    if (bucket) {
      bucket.revenue += txn.revenue || 0;
      bucket.cogs += txn.cogs || 0;
    }
  });

  return buckets.map((b) => ({
    period: b.label,
    revenue: Math.round(b.revenue * 100) / 100,
    cogs: Math.round(b.cogs * 100) / 100,
    profit: Math.round((b.revenue - b.cogs) * 100) / 100,
  }));
}
\`.split('\n');

const startIdx = 58;
const endIdx = 310;
const finalLines = [...lines.slice(0, Math.max(0, startIdx)), ...newCode, ...lines.slice(endIdx + 1)];

fs.writeFileSync('backend/controllers/reportController.js', finalLines.join('\n'));
console.log('Successfully updated file.');
