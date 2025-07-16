document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const filterButton = document.getElementById('filterButton');
    const ordersList = document.getElementById('ordersList');
    const loadingElement = document.querySelector('.loading');

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

            // If backend returns { itemCounts: { [date]: { [itemName]: quantity } } }
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

        Object.entries(itemCounts).forEach(([date, items]) => {
            const dateSection = document.createElement('div');
            dateSection.className = 'order-card';
            dateSection.innerHTML = `<div class="order-header"><div class="order-name">${new Date(date).toLocaleDateString()}</div></div>`;

            Object.entries(items).forEach(([itemName, quantity]) => {
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
});
