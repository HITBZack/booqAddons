# booqAddons

**booqAddons** is a modular toolkit designed to extend and streamline the Booqable experience. Whether you're prepping gear for the week ahead, collecting secure credit card authorization from customers for adjustments, or integrating with your WordPress site using our `booqwp` plugin — booqAddons has you covered.

---

## 🚀 Features

### ✅ 1. Upcoming Orders Item Overview
Easily view and prep all combined items for upcoming Booqable orders within a specified time window. Perfect for rental staff or pickers who need a clear, consolidated list of what’s going out.

- Grouped view of items across multiple orders
- Filter by date range (e.g., week, weekend, custom)
- Ideal for warehouse/prep teams

### 📝 2. Customer Credit Card Authorization Forms _(coming soon)_
Collect secure, PCI-compliant authorization forms from customers for pre-rental credit card authentication.

- Branded form templates
- Status tracking and reminders
- Exportable for Booqable records

### 🌐 3. WordPress Integration via `booqwp` _(starting version of plugin is live)_
Seamlessly connect your Booqable data and workflows with your WordPress site using the existing `booqwp` plugin.

- Custom styling ✔️
- Embeddable shortcodes (soon)
- Real-time order syncing (soon)
- Booking calendar integration (soon)
(https://github.com/HITBZack/booqwp.git)
---

## 📦 Installation

> Requirements:
- Node.js (or your relevant backend if applicable)
- Access to Booqable API
- (Optional) WordPress + booqwp plugin

1. Clone the repository:
```bash
git clone https://github.com/HITBZack/booqAddons.git
Configure your .env or config.js with your Booqable API key and settings.

Run the app:

bash
Copy
Edit
npm install
npm start
(Instructions may vary depending on your stack — update accordingly)

🛠️ Configuration
env
BOOQABLE_API_KEY=your_api_key_here
PORT=3000

💡 Roadmap
Throw all of these goodies in one web app, with the majority of tools built into shortcodes for wordpress, so eventually that plugin will be the home of majority of this. Minus RentalReminder, that is it's own site and service.

 Weekly Combined Item Order View ✔️

 Rental Reminder '(Very close to complete, just doing thorough backend testing.)'

 Credit Card Authorization Form System

 WordPress re-styling of Booqable '(partially done, currently the new item popup is disabled, until I understand the API further.)'

 Slack / Email Notifications

 Map-view filtering support, and delivery ease.

🔗 Related Projects
-- throw these in lata