document.addEventListener('DOMContentLoaded', () => {
    // Always render Unpick All button at top of orders list
    let unpickBtn = document.getElementById('unpickAllBtn');
    const ordersList = document.getElementById('ordersList');
    if (!unpickBtn) {
        unpickBtn = document.createElement('button');
        unpickBtn.id = 'unpickAllBtn';
        unpickBtn.textContent = 'Unpick All';
        unpickBtn.style = 'margin-bottom:16px;background:#d1fae5;color:#065f46;border:none;padding:8px 20px;border-radius:7px;font-size:1rem;cursor:pointer;box-shadow:0 2px 6px #0001;transition:background 0.2s;';
        unpickBtn.onmouseover = () => unpickBtn.style.background = '#a7f3d0';
        unpickBtn.onmouseout = () => unpickBtn.style.background = '#d1fae5';
        unpickBtn.onclick = () => {
            // Remove all picked states
            Object.keys(localStorage).forEach(k => { if (k.startsWith('picked_')) localStorage.removeItem(k); });
            // Uncheck all checkboxes and remove highlight
            document.querySelectorAll('.pick-checkbox').forEach(cb => { cb.checked = false; });
            document.querySelectorAll('.date-item').forEach(item => { item.style.background = ''; });
        };
        ordersList.parentElement.insertBefore(unpickBtn, ordersList);
    }

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
    // Make showModalImg globally accessible for inline HTML event
    window.showModalImg = function(src) {
        modal.querySelector('#modalImg').src = src;
        modal.style.display = 'flex';
    }

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const filterButton = document.getElementById('filterButton');
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

    // Add spacing between Unpick All and Combine All Days buttons
    let combineBtn = document.getElementById('combineButton');
    if (unpickBtn && combineBtn && !document.getElementById('buttonSpacer')) {
        const spacer = document.createElement('div');
        spacer.id = 'buttonSpacer';
        spacer.style.display = 'inline-block';
        spacer.style.width = '16px';
        unpickBtn.parentNode.insertBefore(spacer, combineBtn);
    }
    ordersList.parentNode.insertBefore(unsortButton, ordersList);
    let lastItemCounts = null;

    // Set default date range to next 7 days
    const today = new Date();
    const nextTenDays = new Date();
    nextTenDays.setDate(today.getDate() + 7);
    
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
        // Sort dates ascending (soonest first)
        Object.entries(itemCounts)
            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
            .forEach(([date, orders]) => {
                // orders is now an array of order objects for this date
                orders
                    .sort((a, b) => {
                        // Optional: sort by starts_at time within the day, fallback to orderName
                        if (a.starts_at && b.starts_at) return new Date(a.starts_at) - new Date(b.starts_at);
                        return (a.orderName || '').localeCompare(b.orderName || '');
                    })
                    .forEach(order => {
                        const orderCard = document.createElement('div');
                        orderCard.className = 'order-card';
                        const startStr = order.starts_at ? new Date(order.starts_at).toLocaleString('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                        const stopStr = order.stops_at ? new Date(order.stops_at).toLocaleString('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                        orderCard.innerHTML = `<div class="order-header"><div class="order-dates">${startStr}${stopStr ? ' → ' + stopStr : ''}</div></div>`;
                        // <div class="order-name">${order.orderName || order.orderId}</div>
                        let sortedItems = Object.entries(order.items || {});
                        if (sortMode === 'quantity') {
                            sortedItems = sortedItems.sort((a, b) => b[1].quantity - a[1].quantity);
                        }
                        // Filter unwanted items
                        const filterTerms = ["E-TRANSFER", "PAID BY", "DELIVERY", "Address", "Payment", "Vendor Discount"];
                        sortedItems = sortedItems.filter(([itemName, itemObj]) => {
                            const lowerName = itemName.toLowerCase();
                            return !filterTerms.some(term => lowerName.includes(term.toLowerCase()));
                        });
                        sortedItems.forEach(([itemName, itemObj]) => {
                            const quantity = itemObj.quantity;
                            const item_id = itemObj.item_id;
                            let imgHtml = '';
                            let imgSrc = item_id && itemPhotoMap[item_id] ? itemPhotoMap[item_id] : null;
                            if (imgSrc) {
                                imgHtml = `<img src="${imgSrc}" class="item-thumb" style="width:60px;height:60px;min-width:60px;min-height:60px;max-width:60px;max-height:60px;object-fit:cover;object-position:center center;background:#fff;border-radius:8px;box-shadow:0 2px 8px #0002;cursor:pointer;margin-right:10px;vertical-align:middle;" title="Click to enlarge" onclick="event.stopPropagation();window.showModalImg && window.showModalImg('${imgSrc}');">`;
                            }
                            // Checkbox for picked state
                            const pickedKey = `picked_${item_id}`;
                            const isPicked = localStorage.getItem(pickedKey) === '1';
                            const checkbox = `<input type="checkbox" class="pick-checkbox" data-itemid="${item_id}" ${isPicked ? 'checked' : ''} title="Mark as Picked" style="width:22px;height:22px;min-width:22px;min-height:22px;max-width:22px;max-height:22px;vertical-align:middle;accent-color:#6ee7b7;margin-right:8px;">`;
                            orderCard.innerHTML += `
                                <div class="date-item" data-itemid="${item_id}" style="display:flex;align-items:center;gap:12px;${isPicked ? 'background:#d1fae5;' : ''} border-radius:8px;transition:background 0.2s;padding-left:8px;padding-right:8px;">
                                    ${checkbox}
                                    ${imgHtml}
                                    <div class="date-label">${itemName}</div>
                                    <div class="date-quantity">${quantity}</div>
                                </div>
                            `;
                        });
                        // Add checkbox event listeners after render
                        setTimeout(() => {
                            orderCard.querySelectorAll('.pick-checkbox').forEach(cb => {
                                cb.addEventListener('click', function(e) {
                                    e.stopPropagation(); // Prevent container click handler from firing
                                });
                                cb.addEventListener('change', function(e) {
                                    const id = this.getAttribute('data-itemid');
                                    const parent = this.closest('.date-item');
                                    if (this.checked) {
                                        localStorage.setItem(`picked_${id}`, '1');
                                        parent.style.background = '#d1fae5';
                                    } else {
                                        localStorage.removeItem(`picked_${id}`);
                                        parent.style.background = '';
                                    }
                                });
                            });
                            // Make container clickable to toggle checkbox
                            orderCard.querySelectorAll('.date-item').forEach(item => {
                                item.addEventListener('click', function(e) {
                                    // Don't toggle if clicking image, quantity, or checkbox itself
                                    if (e.target.classList.contains('item-thumb') || e.target.classList.contains('date-quantity') || e.target.classList.contains('pick-checkbox')) return;
                                    const cb = this.querySelector('.pick-checkbox');
                                    if (cb) {
                                        cb.checked = !cb.checked;
                                        cb.dispatchEvent(new Event('change'));
                                    }
                                });
                            });
                        }, 0);
                        ordersList.appendChild(orderCard);
                    });
            });
    }

    // Combine all days logic
    combineButton.addEventListener('click', () => {
        if (!lastItemCounts) return;
        const combined = {};
        // lastItemCounts is now { date: [order, order, ...] }
        Object.values(lastItemCounts).forEach(orderArray => {
            orderArray.forEach(order => {
                Object.entries(order.items || {}).forEach(([itemName, itemObj]) => {
                    if (!combined[itemName]) combined[itemName] = { quantity: 0, item_id: itemObj.item_id };
                    combined[itemName].quantity += itemObj.quantity;
                    // Always use the latest item_id seen
                    combined[itemName].item_id = itemObj.item_id;
                });
            });
        });
        // Display as a single combined card
        // Add Unpick All button if not present
        // Always render Unpick All button once on page load
        let unpickBtn = document.getElementById('unpickAllBtn');
        if (!unpickBtn) {
            unpickBtn = document.createElement('button');
            unpickBtn.id = 'unpickAllBtn';
            unpickBtn.textContent = 'Unpick All';
            unpickBtn.style = 'margin-bottom:16px;background:#d1fae5;color:#065f46;border:none;padding:8px 20px;border-radius:7px;font-size:1rem;cursor:pointer;box-shadow:0 2px 6px #0001;transition:background 0.2s;';
            unpickBtn.onmouseover = () => unpickBtn.style.background = '#a7f3d0';
            unpickBtn.onmouseout = () => unpickBtn.style.background = '#d1fae5';
            unpickBtn.onclick = () => {
                // Remove all picked states
                Object.keys(localStorage).forEach(k => { if (k.startsWith('picked_')) localStorage.removeItem(k); });
                // Uncheck all checkboxes and remove highlight
                document.querySelectorAll('.pick-checkbox').forEach(cb => { cb.checked = false; });
                document.querySelectorAll('.date-item').forEach(item => { item.style.background = ''; });
            };
            // Insert at top of ordersList container
            ordersList.parentElement.insertBefore(unpickBtn, ordersList);
        }
        ordersList.innerHTML = '';
        const combinedSection = document.createElement('div');
        combinedSection.className = 'order-card';
        combinedSection.innerHTML = `<div class="order-header"><div class="order-name">All Days Combined</div></div>`;
        let combinedEntries = Object.entries(combined);
        const sortMode = document.querySelector('input[name="filterMode"]:checked').value;
        if (sortMode === 'quantity') {
            combinedEntries = combinedEntries.sort((a, b) => b[1].quantity - a[1].quantity);
        }
        // Filter unwanted items
        const filterTerms = ["E-TRANSFER", "PAID BY", "DELIVERY", "Address", "Payment", "Vendor Discount"];
        combinedEntries.forEach(([itemName, itemObj]) => {
            const lowerName = itemName.toLowerCase();
            if (filterTerms.some(term => lowerName.includes(term.toLowerCase()))) return;
            const quantity = itemObj.quantity;
            const item_id = itemObj.item_id;
            // Checkbox for picked state
            const pickedKey = `picked_${item_id}`;
            const isPicked = localStorage.getItem(pickedKey) === '1';
            const checkbox = `<input type="checkbox" class="pick-checkbox" data-itemid="${item_id}" ${isPicked ? 'checked' : ''} title="Mark as Picked" style="width:22px;height:22px;min-width:22px;min-height:22px;max-width:22px;max-height:22px;vertical-align:middle;accent-color:#6ee7b7;margin-right:8px;">`;
            let imgHtml = '';
            let imgSrc = item_id && itemPhotoMap[item_id] ? itemPhotoMap[item_id] : null;
            if (imgSrc) {
                imgHtml = `<img src="${imgSrc}" class="item-thumb" style="width:60px;height:60px;min-width:60px;min-height:60px;max-width:60px;max-height:60px;object-fit:cover;object-position:center center;background:#fff;border-radius:8px;box-shadow:0 2px 8px #0002;cursor:pointer;margin-right:10px;vertical-align:middle;" title="Click to enlarge" onclick="event.stopPropagation();window.showModalImg && window.showModalImg('${imgSrc}');">`;
            }
            combinedSection.innerHTML += `
                <div class="date-item" data-itemid="${item_id}" style="display:flex;align-items:center;gap:12px;${isPicked ? 'background:#d1fae5;' : ''} border-radius:8px;transition:background 0.2s;padding-left:8px;padding-right:8px;">
                    ${checkbox}
                    ${imgHtml}
                    <div class="date-label">${itemName}</div>
                    <div class="date-quantity">${quantity}</div>
                </div>
            `;
        });
        // Add checkbox event listeners after render
        setTimeout(() => {
            combinedSection.querySelectorAll('.pick-checkbox').forEach(cb => {
                cb.addEventListener('click', function(e) {
                    e.stopPropagation(); // Prevent container click handler from firing
                });
                cb.addEventListener('change', function() {
                    const id = this.getAttribute('data-itemid');
                    const parent = this.closest('.date-item');
                    if (this.checked) {
                        localStorage.setItem(`picked_${id}`, '1');
                        parent.style.background = '#d1fae5';
                    } else {
                        localStorage.removeItem(`picked_${id}`);
                        parent.style.background = '';
                    }
                });
            });
            // Make container clickable to toggle checkbox
            combinedSection.querySelectorAll('.date-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    if (e.target.classList.contains('item-thumb') || e.target.classList.contains('date-quantity') || e.target.classList.contains('pick-checkbox')) return;
                    const cb = this.querySelector('.pick-checkbox');
                    if (cb) {
                        cb.checked = !cb.checked;
                        cb.dispatchEvent(new Event('change'));
                    }
                });
            });
        }, 0);
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
