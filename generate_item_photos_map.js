// Script to generate item_photos_map.json for frontend use
// Usage: node generate_item_photos_map.js
const fs = require('fs');
const items = JSON.parse(fs.readFileSync('booqable_items_with_photos.json'));
const map = {};
for (const item of items) {
    if (item.photo_url) {
        map[item.item_id] = `/item_photos/${item.item_id}.jpg`;
    }
}
fs.writeFileSync('public/item_photos_map.json', JSON.stringify(map, null, 2));
console.log('item_photos_map.json generated.');
