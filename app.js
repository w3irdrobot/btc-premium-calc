// Constants
const SATS_PER_BTC = 100000000;
const DEFAULT_BTC_PRICE = 118051; // Default price in case API fails

// State
let btcPrice = DEFAULT_BTC_PRICE;

// DOM Elements
const usdInput = document.getElementById('usd-amount');
const premiumInput = document.getElementById('premium');
const satsOutput = document.getElementById('sats-amount');
const btcOutput = document.getElementById('btc-amount');
const exchangeRateOutput = document.getElementById('exchange-rate');
const effectiveRateOutput = document.getElementById('effective-rate');
const exchangeSelect = document.getElementById('exchange-select');

// Format number with commas and optional decimals
const formatNumber = (num, decimals = 0) => {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

// Format currency with proper commas and 2 decimal places
const formatCurrency = (amount) => {
    return `$${formatNumber(amount, 2)}`;
};

// Fetch BTC price from API
const fetchBtcPrice = async () => {
    const selectedExchange = exchangeSelect.value;
    let url;
    console.log(`Fetching BTC price from ${selectedExchange} ...`);

    switch (selectedExchange) {
        case 'kraken':
            url = 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD';
            break;
        case 'coinbase':
            url = 'https://api.coinbase.com/v2/prices/spot?currency=USD';
            break;
        case 'binance':
            url = 'https://api.binance.us/api/v3/ticker/price?symbol=BTCUSD';
            break;
        default:
            url = 'https://mempool.space/api/v1/prices';
    }

    try {
        let price;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch BTC price');
        const data = await response.json();

        if (selectedExchange === 'mempool') {
            price = data.USD;
        } else if (selectedExchange === 'kraken') {
            price = data.result.XXBTZUSD.c[0];
        } else if (selectedExchange === 'coinbase') {
            price = data.data.amount;
        } else if (selectedExchange === 'binance') {
            price = data.price;
        }

        return Math.round(price);
    } catch (error) {
        console.error(`Error fetching BTC price from ${selectedExchange}:`, error);
        return DEFAULT_BTC_PRICE;
    }
};

// Animate number change
const animateValue = (element, start, end, type, duration = 500) => {
    const range = end - start;
    const startTime = performance.now();

    const updateNumber = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = type === 'sats' ? Math.floor(start + (range * progress)) : (start + (range * progress)).toFixed(8);

        element.textContent = formatNumber(current);

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    };

    requestAnimationFrame(updateNumber);
};

// Calculate sats based on USD and premium
const calculateSats = async () => {
    const usdAmount = parseFloat(usdInput.value) || 0;
    const premiumPercentage = premiumInput.value === '' ? 0 : parseFloat(premiumInput.value) || 0;
    
    // Get current BTC price if not already set
    if (btcPrice === DEFAULT_BTC_PRICE) {
        btcPrice = await fetchBtcPrice();
    }
    
    const effectiveRate = btcPrice * (1 + (premiumPercentage / 100));
    const btcAmount = usdAmount / effectiveRate;
    const sats = Math.floor(btcAmount * SATS_PER_BTC);
    
    // Update UI with animations and rates
    animateValue(satsOutput, parseInt(satsOutput.textContent.replace(/,/g, '') || '0'), sats, 'sats');
    animateValue(btcOutput, parseFloat(btcOutput.textContent || '0.0'), btcAmount, 'btc');
    exchangeRateOutput.textContent = formatCurrency(btcPrice);
    effectiveRateOutput.textContent = formatCurrency(effectiveRate);
};

// Add input validation
const validateInput = (input) => {
    // Allow numbers, a single decimal point, and negative sign
    const value = input.value;
    const isNegative = value.startsWith('-');
    const cleanValue = value.replace(/[^0-9.]/g, '');
    let newValue = isNegative ? '-' + cleanValue : cleanValue;

    // Only update if the value actually changed to avoid cursor jumping
    if (value !== newValue) {
        const cursorPos = input.selectionStart - (value.length - newValue.length);
        input.value = newValue;
        input.setSelectionRange(cursorPos, cursorPos);
    }

    // Handle decimal places on blur instead of during input
    input.addEventListener('blur', function formatDecimal() {
        const parts = this.value.replace('-', '').split('.');
        if (parts.length === 2) {
            const decimalPlaces = this.id === 'usd-amount' ? 2 : 1;
            const formattedValue = parts[0] + (parts[1] ? '.' + parts[1].slice(0, decimalPlaces) : '');
            this.value = this.value.startsWith('-') ? '-' + formattedValue : formattedValue;
        }
    }, { once: true });
};

// Event Listeners
usdInput.addEventListener('input', () => {
    validateInput(usdInput);
    calculateSats();
});

premiumInput.addEventListener('input', () => {
    validateInput(premiumInput);
    calculateSats();
});

// Handle keyboard navigation
usdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        premiumInput.focus();
    }
});

premiumInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        usdInput.focus();
    }
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Set initial values
    usdInput.value = '100';
    premiumInput.value = '0';
    
    // Calculate initial sats
    calculateSats();
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});

exchangeSelect.addEventListener('change', async () => {
    btcPrice = await fetchBtcPrice(); // update price from new source
    calculateSats(); // recalculate with new rate
});