document.addEventListener('DOMContentLoaded', () => {
    // Load item photo map
    let itemPhotoMap = {};
    // Wait for itemPhotoMap to load before rendering anything
    let itemPhotoMapLoaded = false;
    fetch('item_photos_map.json').then(r => r.json()).then(map => {
        itemPhotoMap = map;
        itemPhotoMapLoaded = true;
        // Only now fetch orders
        fetchOrders();
    });

    // Modal for full image view
    const modal = document.createElement('div');
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.85)';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '10000';
    modal.innerHTML = '<img id="modalImg" style="max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 4px 32px #0007">';
    document.body.appendChild(modal);
    modal.onclick = () => { modal.style.display = 'none'; };
    function showModalImg(src) {
        modal.querySelector('#modalImg').src = src;
        modal.style.display = 'flex';
    }

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const filterButton = document.getElementById('filterButton');
    const ordersList = document.getElementById('ordersList');
    const loadingElement = document.querySelector('.loading');
    // Add filter mode controls
    const filterModesDiv = document.createElement('div');
    filterModesDiv.style.display = 'inline-block';
    filterModesDiv.style.marginRight = '10px';
    filterButton.parentNode.insertBefore(filterModesDiv, filterButton);

    // Radio: Sort by Quantity (default)
    const sortQtyRadio = document.createElement('input');
    sortQtyRadio.type = 'radio';
    sortQtyRadio.name = 'filterMode';
    sortQtyRadio.value = 'quantity';
    sortQtyRadio.id = 'sortQtyRadio';
    sortQtyRadio.checked = true;
    filterModesDiv.appendChild(sortQtyRadio);
    const sortQtyLabel = document.createElement('label');
    sortQtyLabel.htmlFor = 'sortQtyRadio';
    sortQtyLabel.textContent = 'Sort by Quantity';
    filterModesDiv.appendChild(sortQtyLabel);

    //horizontal spacer
    const spacer = document.createElement('div');
    spacer.style.width = '10px';
    filterModesDiv.appendChild(spacer);

    // Add Combine All Days Button
    const combineButton = document.createElement('button');
    combineButton.id = 'combineButton';
    combineButton.textContent = 'Combine All Days';
    combineButton.style.margin = '10px 10px 10px 0';
    // Add Return to Per-Day View Button
    const unsortButton = document.createElement('button');
    unsortButton.id = 'unsortButton';
    unsortButton.textContent = 'Return to Per-Day View';
    unsortButton.style.margin = '10px 0';
    unsortButton.style.display = 'none';
    ordersList.parentNode.insertBefore(combineButton, ordersList);
    ordersList.parentNode.insertBefore(unsortButton, ordersList);
    let lastItemCounts = null;

    // Set default date range to next 10 days
    const today = new Date();
    const nextTenDays = new Date();
    nextTenDays.setDate(today.getDate() + 10);
    
    startDateInput.value = today.toISOString().split('T')[0];
    endDateInput.value = nextTenDays.toISOString().split('T')[0];

    // Fetch orders on page load
    fetchOrders();

    // Add event listener for filter button
    filterButton.addEventListener('click', fetchOrders);

    async function fetchOrders() {
        try {
            loadingElement.style.display = 'block';
            ordersList.innerHTML = '';

            const response = await fetch('/api/orders');
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            lastItemCounts = data.itemCounts;
            displayAggregatedItems(data.itemCounts);
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersList.innerHTML = `<div class="error">Failed to load orders: ${error.message}</div>`;
        } finally {
            loadingElement.style.display = 'none';
        }
    }

    // New function to display aggregated items by date and item name
    function displayAggregatedItems(itemCounts) {
        ordersList.innerHTML = '';
        if (!itemCounts || Object.keys(itemCounts).length === 0) {
            ordersList.innerHTML = '<div>No upcoming items found for the selected date range.</div>';
            return;
        }
        const sortMode = document.querySelector('input[name="filterMode"]:checked').value;
        Object.entries(itemCounts).forEach(([date, items]) => {
            const dateSection = document.createElement('div');
            dateSection.className = 'order-card';
            dateSection.innerHTML = `<div class="order-header"><div class="order-name">${new Date(date).toLocaleDateString()}</div></div>`;
            let sortedItems = Object.entries(items);
            if (sortMode === 'quantity') {
                sortedItems = sortedItems.sort((a, b) => b[1].quantity - a[1].quantity);
            }
            sortedItems.forEach(([itemName, itemObj]) => {
                const quantity = itemObj.quantity;
                const item_id = itemObj.item_id;
                let imgHtml = '';
                let imgSrc = item_id && itemPhotoMap[item_id] ? itemPhotoMap[item_id] : null;
                if (imgSrc) {
                    imgHtml = `<img src="${imgSrc}" class="item-thumb" style="width:60px;height:60px;object-fit:cover;border-radius:8px;box-shadow:0 2px 8px #0002;cursor:pointer;margin-right:10px;vertical-align:middle;" title="Click to enlarge" onclick="event.stopPropagation();window.showModalImg && window.showModalImg('${imgSrc}');">`;
                }
                dateSection.innerHTML += `
                    <div class="date-item" style="display:flex;align-items:center;gap:12px;">
                        ${imgHtml}
                        <div class="date-label">${itemName}</div>
                        <div class="date-quantity">${quantity}</div>
                    </div>
                `;
            });
            ordersList.appendChild(dateSection);
        });
    }

    // Combine all days logic
    combineButton.addEventListener('click', () => {
        if (!lastItemCounts) return;
        const combined = {};
        Object.values(lastItemCounts).forEach(items => {
            Object.entries(items).forEach(([itemName, itemObj]) => {
                if (!combined[itemName]) combined[itemName] = { quantity: 0, item_id: itemObj.item_id };
                combined[itemName].quantity += itemObj.quantity;
                // Always use the latest item_id seen
                combined[itemName].item_id = itemObj.item_id;
            });
        });
        // Display as a single combined card
        ordersList.innerHTML = '';
        const combinedSection = document.createElement('div');
        combinedSection.className = 'order-card';
        combinedSection.innerHTML = `<div class="order-header"><div class="order-name">All Days Combined</div></div>`;
        let combinedEntries = Object.entries(combined);
        const sortMode = document.querySelector('input[name="filterMode"]:checked').value;
        if (sortMode === 'quantity') {
            combinedEntries = combinedEntries.sort((a, b) => b[1].quantity - a[1].quantity);
        }
        combinedEntries.forEach(([itemName, itemObj]) => {
            const quantity = itemObj.quantity;
            const item_id = itemObj.item_id;
            let imgHtml = '';
            let imgSrc = item_id && itemPhotoMap[item_id] ? itemPhotoMap[item_id] : null;
            if (imgSrc) {
                imgHtml = `<img src="${imgSrc}" class="item-thumb" style="width:60px;height:60px;object-fit:cover;border-radius:8px;box-shadow:0 2px 8px #0002;cursor:pointer;margin-right:10px;vertical-align:middle;" title="Click to enlarge" onclick="event.stopPropagation();window.showModalImg && window.showModalImg('${imgSrc}');">`;
            }
            combinedSection.innerHTML += `
                <div class="date-item" style="display:flex;align-items:center;gap:12px;">
                    ${imgHtml}
                    <div class="date-label">${itemName}</div>
                    <div class="date-quantity">${quantity}</div>
                </div>
            `;
        });
        ordersList.appendChild(combinedSection);
        combineButton.style.display = 'none';
        unsortButton.style.display = '';
    });

    unsortButton.addEventListener('click', () => {
        if (!lastItemCounts) return;
        displayAggregatedItems(lastItemCounts);
        combineButton.style.display = '';
        unsortButton.style.display = 'none';
    });

    // Re-render on filter mode change
    [sortQtyRadio].forEach(radio => radio.addEventListener('change', () => {
        if (unsortButton.style.display === 'none') {
            // Per-day mode
            displayAggregatedItems(lastItemCounts);
        } else {
            // Combined mode
            combineButton.click();
        }
    }));
});
