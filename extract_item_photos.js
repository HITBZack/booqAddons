// Script to fetch all items from Booqable API and save item_id, item_name, photo_url to a JSON file
// Run with: node extract_item_photos.js
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const BOOQABLE_API_KEY = process.env.BOOQABLE_API_KEY;
const BOOQABLE_API_URL = process.env.BOOQABLE_API_URL;

async function fetchAllItems() {
    let allItems = [];
    let page = 1;
    let keepGoing = true;
    const axiosConfig = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BOOQABLE_API_KEY}`,
        }
    };
    while (keepGoing) {
        const url = `${BOOQABLE_API_URL}/4/items?fields[items]=id,name,photo_url&page[number]=${page}&page[size]=100`;
        const response = await axios.get(url, axiosConfig);
        const items = Array.isArray(response.data.data) ? response.data.data : [];
        allItems = allItems.concat(
            items.map(i => ({
                item_id: i.id,
                item_name: i.attributes.name,
                photo_url: i.attributes.photo_url || null
            }))
        );
        keepGoing = items.length === 100;
        page++;
    }
    return allItems;
}

(async () => {
    try {
        console.log('Fetching all items from Booqable...');
        const items = await fetchAllItems();
        // Sort by item_name for easier browsing
        items.sort((a, b) => a.item_name.localeCompare(b.item_name));
        fs.writeFileSync('booqable_items_with_photos.json', JSON.stringify(items, null, 2));
        console.log(`Saved ${items.length} items to booqable_items_with_photos.json`);
    } catch (err) {
        console.error('Failed to fetch items:', err);
    }
})();
