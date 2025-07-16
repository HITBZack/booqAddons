document.addEventListener('DOMContentLoaded', () => {
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

    // Radio: Sort by Category (prep only)
    const sortCatRadio = document.createElement('input');
    sortCatRadio.type = 'radio';
    sortCatRadio.name = 'filterMode';
    sortCatRadio.value = 'category';
    sortCatRadio.id = 'sortCatRadio';
    filterModesDiv.appendChild(sortCatRadio);
    const sortCatLabel = document.createElement('label');
    sortCatLabel.htmlFor = 'sortCatRadio';
    sortCatLabel.textContent = 'Sort by Category (coming soon)';
    filterModesDiv.appendChild(sortCatLabel);

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
                sortedItems = sortedItems.sort((a, b) => b[1] - a[1]);
            } else if (sortMode === 'category') {
                // TODO: Implement category sorting logic here
            }
            sortedItems.forEach(([itemName, quantity]) => {
                dateSection.innerHTML += `
                    <div class="date-item">
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
            Object.entries(items).forEach(([itemName, quantity]) => {
                if (!combined[itemName]) combined[itemName] = 0;
                combined[itemName] += quantity;
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
            combinedEntries = combinedEntries.sort((a, b) => b[1] - a[1]);
        } else if (sortMode === 'category') {
            // TODO: Implement category sorting logic here
        }
        combinedEntries.forEach(([itemName, quantity]) => {
            combinedSection.innerHTML += `
                <div class="date-item">
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
    [sortQtyRadio, sortCatRadio].forEach(radio => radio.addEventListener('change', () => {
        if (unsortButton.style.display === 'none') {
            // Per-day mode
            displayAggregatedItems(lastItemCounts);
        } else {
            // Combined mode
            combineButton.click();
        }
    }));
});
