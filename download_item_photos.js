// Script to download all item images from booqable_items_with_photos.json
// Usage: node download_item_photos.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const itemsFile = 'booqable_items_with_photos.json';
const outputDir = 'item_photos';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

async function downloadImage(url, dest) {
    const writer = fs.createWriteStream(dest);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 20000
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

(async () => {
    const items = JSON.parse(fs.readFileSync(itemsFile));
    let count = 0;
    for (const item of items) {
        if (!item.photo_url) continue;
        const ext = path.extname(item.photo_url).split('?')[0] || '.jpg';
        const filename = `${item.item_id}.jpg`;
        const dest = path.join(outputDir, filename);
        if (fs.existsSync(dest)) {
            console.log(`Skipping (already exists): ${filename}`);
            continue;
        }
        try {
            console.log(`Downloading ${filename}...`);
            await downloadImage(item.photo_url, dest);
            count++;
        } catch (err) {
            console.error(`Failed to download ${filename}:`, err.message);
        }
    }
    console.log(`Downloaded ${count} images to ${outputDir}/`);
})();
