/**
 * ShoreSquad - Main Application
 * Features:
 * - Geolocation API for user location
 * - Leaflet.js integration for interactive maps
 * - Weather API integration
 * - LocalStorage for user data persistence
 * - Responsive UI with accessibility support
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    weatherApiKey: 'YOUR_OPENWEATHERMAP_API_KEY', // Replace with actual API key
    weatherApiUrl: 'https://api.openweathermap.org/data/2.5/weather',
    defaultLocation: { lat: 40.7128, lng: -74.0060 }, // NYC fallback
    mapZoom: 12,
    beachEvents: [
        { lat: 40.5731, lng: -74.4730, name: 'Staten Island Beach Cleanup', members: 12 },
        { lat: 40.7282, lng: -73.7949, name: 'Queens Beach Initiative', members: 8 },
        { lat: 40.7489, lng: -73.9680, name: 'Manhattan Waterfront Project', members: 15 },
    ]
};

// ============================================
// DOM ELEMENT REFERENCES
// ============================================

const elements = {
    hamburger: document.getElementById('hamburger'),
    navMenu: document.getElementById('navMenu'),
    loginBtn: document.getElementById('loginBtn'),
    heroCtaBtn: document.getElementById('heroCtaBtn'),
    mapContainer: document.getElementById('mapContainer'),
    locateBtn: document.getElementById('locateBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    weatherWidget: document.getElementById('weatherWidget'),
    crewsList: document.getElementById('crewsList'),
    createCrewBtn: document.getElementById('createCrewBtn'),
    leaderboardContent: document.getElementById('leaderboardContent'),
    tabButtons: document.querySelectorAll('.tab-btn')
};

// ============================================
// STATE MANAGEMENT
// ============================================

let appState = {
    userLocation: null,
    map: null,
    markers: [],
    userCrew: null,
    currentTab: 'crews',
    isDarkMode: false
};

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('shoreSquadState');
    if (saved) {
        appState = { ...appState, ...JSON.parse(saved) };
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('shoreSquadState', JSON.stringify({
        userCrew: appState.userCrew,
        userLocation: appState.userLocation,
        currentTab: appState.currentTab
    }));
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌊 ShoreSquad App Initializing...');
    
    loadState();
    initializeNavigation();
    initializeMap();
    initializeEventListeners();
    fetchWeather();
    initializeLeaderboard();
    
    // Get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                appState.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('✅ Location found:', appState.userLocation);
                saveState();
                updateMapCenter();
            },
            (error) => {
                console.warn('⚠️ Geolocation error:', error.message);
                appState.userLocation = CONFIG.defaultLocation;
            }
        );
    }
    
    // Register Service Worker for offline support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            console.log('Service Worker registration skipped');
        });
    }
    
    console.log('✨ ShoreSquad Ready!');
});

// ============================================
// NAVIGATION & UI
// ============================================

function initializeNavigation() {
    // Hamburger menu toggle
    elements.hamburger?.addEventListener('click', () => {
        elements.navMenu.classList.toggle('active');
        const isActive = elements.navMenu.classList.contains('active');
        elements.hamburger.setAttribute('aria-expanded', isActive);
    });

    // Close menu on nav link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            elements.navMenu.classList.remove('active');
            elements.hamburger.setAttribute('aria-expanded', false);
        });
    });

    // CTA buttons
    elements.loginBtn?.addEventListener('click', showLoginModal);
    elements.heroCtaBtn?.addEventListener('click', showCrewModal);
    elements.createCrewBtn?.addEventListener('click', showCrewModal);
}

// ============================================
// MAP FUNCTIONALITY
// ============================================

function initializeMap() {
    // Initialize Leaflet map
    appState.map = L.map('mapContainer').setView(
        [CONFIG.defaultLocation.lat, CONFIG.defaultLocation.lng],
        CONFIG.mapZoom
    );

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        alt: 'OpenStreetMap tile layer'
    }).addTo(appState.map);

    // Add beach event markers
    addBeachMarkers();

    // Map controls
    elements.locateBtn?.addEventListener('click', locateUser);
    elements.refreshBtn?.addEventListener('click', refreshBeachEvents);
}

function addBeachMarkers() {
    // Clear existing markers
    appState.markers.forEach(marker => appState.map.removeLayer(marker));
    appState.markers = [];

    // Add new markers for beach events
    CONFIG.beachEvents.forEach((event) => {
        const marker = L.circleMarker([event.lat, event.lng], {
            radius: 8,
            fillColor: '#0066CC',
            color: '#003d99',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        })
        .bindPopup(`
            <div style="font-weight: bold; margin-bottom: 8px;">${event.name}</div>
            <div>👥 ${event.members} members participating</div>
            <button onclick="joinEvent('${event.name}')" style="
                margin-top: 10px;
                padding: 8px 16px;
                background: #0066CC;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
            ">Join This Event</button>
        `)
        .on('mouseover', function() { this.setRadius(12); })
        .on('mouseout', function() { this.setRadius(8); })
        .addTo(appState.map);

        appState.markers.push(marker);
    });

    console.log(`📍 Added ${appState.markers.length} beach events to map`);
}

function locateUser() {
    if (appState.userLocation) {
        appState.map.setView([appState.userLocation.lat, appState.userLocation.lng], 14);
        
        // Add user location marker
        L.circleMarker([appState.userLocation.lat, appState.userLocation.lng], {
            radius: 6,
            fillColor: '#00AA66',
            color: '#006644',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        })
        .bindPopup('Your Location', { autoClose: false })
        .addTo(appState.map)
        .openPopup();

        console.log('📍 User located on map');
    } else {
        alert('Location not available. Please enable location services.');
    }
}

function updateMapCenter() {
    if (appState.userLocation && appState.map) {
        appState.map.setView([appState.userLocation.lat, appState.userLocation.lng], CONFIG.mapZoom);
    }
}

function refreshBeachEvents() {
    elements.refreshBtn.classList.add('spin');
    
    // Simulate API call
    setTimeout(() => {
        addBeachMarkers();
        elements.refreshBtn.classList.remove('spin');
        console.log('🔄 Beach events refreshed');
    }, 800);
}

// ============================================
// WEATHER INTEGRATION
// ============================================

async function fetchWeather() {
    if (!appState.userLocation) return;

    try {
        // Using mock data for demo (replace with actual API call)
        const weatherData = {
            temp: 72,
            condition: 'Partly Cloudy',
            humidity: 65,
            windSpeed: 8,
            uvIndex: 6,
            icon: '⛅'
        };

        displayWeather(weatherData);
    } catch (error) {
        console.error('🌦️ Weather fetch error:', error);
        elements.weatherWidget.innerHTML = '<div class="loading">Unable to load weather data</div>';
    }
}

function displayWeather(data) {
    elements.weatherWidget.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${data.icon}</div>
            <div style="font-size: 28px; color: #0066CC; font-weight: bold;">${data.temp}°F</div>
            <div style="font-size: 18px; color: #666;">${data.condition}</div>
        </div>
        <div class="weather-item">
            <span>💧 Humidity</span>
            <span>${data.humidity}%</span>
        </div>
        <div class="weather-item">
            <span>💨 Wind Speed</span>
            <span>${data.windSpeed} mph</span>
        </div>
        <div class="weather-item">
            <span>☀️ UV Index</span>
            <span>${data.uvIndex}</span>
        </div>
    `;
}

// ============================================
// LEADERBOARD
// ============================================

function initializeLeaderboard() {
    // Setup tab switching
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.tabButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            appState.currentTab = e.target.dataset.tab;
            displayLeaderboard();
            saveState();
        });
    });

    displayLeaderboard();
}

function displayLeaderboard() {
    const leaderboardData = appState.currentTab === 'crews' 
        ? getTopCrews()
        : getTopMembers();

    elements.leaderboardContent.innerHTML = leaderboardData.map((item, index) => {
        const badgeClass = index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze';
        const rank = index + 1;

        return `
            <div class="leaderboard-item">
                <div class="rank-badge ${badgeClass}">${rank}</div>
                <div class="leaderboard-item-content">
                    <h3>${item.name}</h3>
                    <p>${item.stat}</p>
                </div>
            </div>
        `;
    }).join('');
}

function getTopCrews() {
    return [
        { name: 'Ocean Warriors', stat: '🏆 1,250 lbs trash removed' },
        { name: 'Coastal Guardians', stat: '🏆 980 lbs trash removed' },
        { name: 'Beach Legends', stat: '🏆 875 lbs trash removed' },
        { name: 'Tidal Force', stat: '🏆 720 lbs trash removed' },
        { name: 'Wave Riders', stat: '🏆 650 lbs trash removed' }
    ];
}

function getTopMembers() {
    return [
        { name: 'Alex Chen', stat: '🌟 42 events, 180 hours' },
        { name: 'Jordan Mills', stat: '🌟 38 events, 165 hours' },
        { name: 'Casey Rivera', stat: '🌟 35 events, 155 hours' },
        { name: 'Morgan Lee', stat: '🌟 31 events, 140 hours' },
        { name: 'Taylor Park', stat: '🌟 28 events, 130 hours' }
    ];
}

// ============================================
// CREWS MANAGEMENT
// ============================================

function displayCrews() {
    const crews = [
        {
            name: 'Founding Crew',
            members: 12,
            events: 5,
            impact: '250 lbs of trash removed'
        },
        {
            name: 'East Coast Squad',
            members: 8,
            events: 3,
            impact: '120 lbs of trash removed'
        }
    ];

    elements.crewsList.innerHTML = crews.map(crew => `
        <div class="crew-card">
            <h3>${crew.name}</h3>
            <p class="crew-info">👥 Members: ${crew.members}</p>
            <p class="crew-info">📅 Events: ${crew.events}</p>
            <p class="crew-info">🌍 Impact: ${crew.impact}</p>
            <button class="btn btn-secondary btn-sm" onclick="viewCrew('${crew.name}')">View Crew</button>
        </div>
    `).join('');
}

// ============================================
// MODALS & INTERACTIONS
// ============================================

function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            <h2>Join ShoreSquad</h2>
            <form onsubmit="handleLogin(event)">
                <input type="email" placeholder="Email" required>
                <input type="password" placeholder="Password" required>
                <button type="submit" class="btn btn-primary btn-large">Sign In</button>
                <p style="text-align: center; margin-top: 10px;">
                    Don't have an account? <a href="#" onclick="showSignupModal()">Sign Up</a>
                </p>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function showSignupModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            <h2>Create Your ShoreSquad Account</h2>
            <form onsubmit="handleSignup(event)">
                <input type="text" placeholder="Full Name" required>
                <input type="email" placeholder="Email" required>
                <input type="password" placeholder="Password" required>
                <button type="submit" class="btn btn-primary btn-large">Create Account</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function showCrewModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            <h2>Create New Crew</h2>
            <form onsubmit="handleCreateCrew(event)">
                <input type="text" placeholder="Crew Name" required>
                <textarea placeholder="Crew Description" rows="4" required></textarea>
                <input type="text" placeholder="Location (Beach/Area)" required>
                <button type="submit" class="btn btn-primary btn-large">Create Crew</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleLogin(event) {
    event.preventDefault();
    console.log('✅ Login attempt');
    showNotification('Welcome back to ShoreSquad! 🌊');
    event.target.closest('.modal').remove();
}

function handleSignup(event) {
    event.preventDefault();
    console.log('✅ Signup attempt');
    showNotification('Welcome to ShoreSquad! Ready to save the ocean? 🌊');
    event.target.closest('.modal').remove();
}

function handleCreateCrew(event) {
    event.preventDefault();
    console.log('✅ Crew created');
    showNotification('🎉 Crew created! Invite your friends to join!');
    displayCrews();
    event.target.closest('.modal').remove();
}

function joinEvent(eventName) {
    showNotification(`✨ You've joined: ${eventName}!`);
}

function viewCrew(crewName) {
    showNotification(`Viewing crew: ${crewName}`);
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #00AA66;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInUp 0.3s ease;
        z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInDown 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

function logPerformance(label) {
    console.log(`⏱️ ${label}: ${performance.now().toFixed(2)}ms`);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.remove());
    }
});

// ============================================
// EXPORT FOR BROWSER CONSOLE ACCESS
// ============================================

window.ShoreSquad = {
    appState,
    displayCrews,
    fetchWeather,
    displayLeaderboard
};

console.log('💡 Tip: Access ShoreSquad API via window.ShoreSquad in console');
