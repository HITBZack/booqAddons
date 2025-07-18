const env = require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const moment = require('moment');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
// Serve static item images
app.use('/item_photos', express.static('item_photos'));


// Booqable API configuration
const BOOQABLE_API_KEY = process.env.BOOQABLE_API_KEY;
const BOOQABLE_API_URL = process.env.BOOQABLE_API_URL;

// Get upcoming orders for the next 10 days
app.get('/api/orders', async (req, res) => {
  try {
    const startDate = moment().toISOString();
    const endDate = moment().add(10, 'days').toISOString();

    console.log('Using Booqable API Key:', BOOQABLE_API_KEY);

    // Switch to /api/4/orders/search POST endpoint for proper filtering
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOOQABLE_API_KEY}`,
      }
    };

    // Build filter body as per Booqable API docs
    const filterBody = {
      fields: {
        orders: "id"
      },
      filter: {
        conditions: {
          operator: "and",
          attributes: [
            {
              operator: "or",
              attributes: [
                {
                  starts_at: {
                    gte: startDate,
                    lte: endDate
                  }
                },
                {
                  stops_at: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              ]
            },
            {
              operator: "and",
              attributes: [
                { deposit_type: "none" },
                { payment_status: "paid" }
              ]
            }
          ]
        }
      }
    };

    let orderIds = [];
    try {
      const ordersResponse = await axios.post(
        `${BOOQABLE_API_URL}/4/orders/search`,
        filterBody,
        axiosConfig
      );
      //fs.writeFileSync('booqable_api_response.json', JSON.stringify(ordersResponse.data, null, 2));
      if (Array.isArray(ordersResponse.data.data)) {
        orderIds = ordersResponse.data.data.map(o => o.id);
      } else {
        throw new Error('No data array in live Booqable API response');
      }
    } catch (err) {
      console.error('Failed to fetch order IDs from Booqable API:', err.message);
      return res.status(500).json({ error: 'Failed to fetch order IDs from Booqable API.' });
    }

    const fullOrders = [];
    for (const id of orderIds) {
      try {
        const orderDetailResp = await axios.get(
          `${BOOQABLE_API_URL}/4/orders/${id}?include=lines.item`,
          axiosConfig
        );
        if (orderDetailResp.data && orderDetailResp.data.data) {
          fullOrders.push({
            data: orderDetailResp.data.data,
            included: orderDetailResp.data.included || []
          });
        }
      } catch (err) {
        console.error(`Failed to fetch order ${id}:`, err.message);
      }
    }

    //this is for full inspection when we testin.
    //fs.writeFileSync('booqable_full_orders.json', JSON.stringify(fullOrders, null, 2));

    // Aggregate item counts by date and item name using relationships/lines and included
    const itemCounts = {};
    for (const order of fullOrders) {
      const attrs = order.data.attributes || {};
      const orderDate = attrs.starts_at ? require('moment')(attrs.starts_at).format('YYYY-MM-DD') : null;
      if (!orderDate || !order.data.relationships || !order.data.relationships.lines || !Array.isArray(order.data.relationships.lines.data)) continue;
      // Build lookup tables for included lines and products
      const included = order.included || [];
      const linesById = {};
      const productsById = {};
      for (const inc of included) {
        if (inc.type === 'lines') linesById[inc.id] = inc;
        if (inc.type === 'products') productsById[inc.id] = inc;
      }
      for (const lineRef of order.data.relationships.lines.data) {
        const line = linesById[lineRef.id];
        if (!line || !line.attributes) continue;
        const lineAttrs = line.attributes;
        const itemName = lineAttrs.title;
        const quantity = lineAttrs.quantity;
        // Extract item_id from relationships if available
        let item_id = null;
        if (line.relationships && line.relationships.item && line.relationships.item.data) {
          item_id = line.relationships.item.data.id;
        }
        if (!itemName || typeof quantity !== 'number') continue;
        if (!itemCounts[orderDate]) itemCounts[orderDate] = {};
        if (!itemCounts[orderDate][itemName]) {
          itemCounts[orderDate][itemName] = { quantity: 0, item_id };
        }
        itemCounts[orderDate][itemName].quantity += quantity;
        // Always update item_id to the latest found (in case of duplicates)
        itemCounts[orderDate][itemName].item_id = item_id;

      }
    }
    //console.log('Aggregated itemCounts:', JSON.stringify(itemCounts, null, 2));

    return res.json({ itemCounts });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
