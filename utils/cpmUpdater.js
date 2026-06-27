const cron = require('node-cron');
const axios = require('axios');
const Setting = require('../models/Setting');

// Yeh task roz raat ko 12:00 AM par chalega
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('Running Automatic CPM Update...');

        // Example: Ad-network ya CPM provider ki API
        // Aap yahan koi bhi trusted API endpoint daal sakte hain
        const response = await axios.get('https://api.example-ad-network.com/v1/rates');
        const liveRates = response.data; // { "US": 10.5, "IN": 4.2 }

        await Setting.findOneAndUpdate({}, {
            countryRates: liveRates,
            defaultCpm: liveRates['GLOBAL'] || 1.00
        }, { upsert: true });

        console.log('CPM Rates updated successfully!');
    } catch (error) {
        console.error('CPM Update Failed:', error);
    }
});
