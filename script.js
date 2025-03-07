// API configuration
const apiKey = 'f00c38e0279b7bc85480c3fe775d518c';
const weatherApiUrl = 'https://api.openweathermap.org/data/2.5/weather';
const forecastApiUrl = 'https://api.openweathermap.org/data/2.5/forecast';
let map, marker;

// DOM Elements
const locationInput = document.getElementById('locationInput');
const searchButton = document.getElementById('searchButton');
const getCurrentLocationButton = document.getElementById('getCurrentLocation');
const elements = {
    location: document.getElementById('location'),
    temperature: document.getElementById('temperature'),
    description: document.getElementById('description'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    feelsLike: document.getElementById('feels-like'),
    weatherIcon: document.getElementById('weather-icon'),
    forecastContainer: document.getElementById('forecast-container')
};

// Initialize map
function initMap() {
    map = L.map('weather-map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Initialize the application
function initializeApp() {
    initMap();
    setupEventListeners();
    // Get user's location on load if permitted
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
            error => console.error('Error getting location:', error)
        );
    }
}

// Set up event listeners
function setupEventListeners() {
    searchButton.addEventListener('click', () => {
        const location = locationInput.value;
        if (location) fetchWeatherByCity(location);
    });

    getCurrentLocationButton.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
                error => console.error('Error getting location:', error)
            );
        }
    });

    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const location = locationInput.value;
            if (location) fetchWeatherByCity(location);
        }
    });
}

// Fetch weather by city name
async function fetchWeatherByCity(city) {
    try {
        const weatherResponse = await fetch(
            `${weatherApiUrl}?q=${city}&appid=${apiKey}&units=metric`
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.cod === 200) {
            updateWeatherUI(weatherData);
            fetchForecast(weatherData.coord.lat, weatherData.coord.lon);
            updateMap(weatherData.coord.lat, weatherData.coord.lon);
        } else {
            showError('Location not found');
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError('Error fetching weather data');
    }
}

// Fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        const weatherResponse = await fetch(
            `${weatherApiUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.cod === 200) {
            updateWeatherUI(weatherData);
            fetchForecast(lat, lon);
            updateMap(lat, lon);
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError('Error fetching weather data');
    }
}

// Fetch 5-day forecast
async function fetchForecast(lat, lon) {
    try {
        const forecastResponse = await fetch(
            `${forecastApiUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        const forecastData = await forecastResponse.json();

        if (forecastData.cod === '200') {
            updateForecastUI(forecastData);
        }
    } catch (error) {
        console.error('Error fetching forecast:', error);
    }
}

// Update weather UI
function updateWeatherUI(data) {
    elements.location.textContent = `${data.name}, ${data.sys.country}`;
    elements.temperature.textContent = `${Math.round(data.main.temp)}°C`;
    elements.description.textContent = capitalizeFirst(data.weather[0].description);
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${data.wind.speed} m/s`;
    elements.feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    elements.weatherIcon.innerHTML = getWeatherEmoji(data.weather[0].id);
}

// Update forecast UI
function updateForecastUI(data) {
    const dailyForecasts = getDailyForecasts(data.list);
    elements.forecastContainer.innerHTML = dailyForecasts
        .map(forecast => createForecastCard(forecast))
        .join('');
}

// Update map
function updateMap(lat, lon) {
    map.setView([lat, lon], 10);
    if (marker) marker.remove();
    marker = L.marker([lat, lon]).addTo(map);
}

// Helper functions
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getWeatherEmoji(weatherId) {
    const weatherEmojis = {
        200: '⛈️', // thunderstorm
        300: '🌧️', // drizzle
        500: '🌧️', // rain
        600: '🌨️', // snow
        700: '🌫️', // atmosphere
        800: '☀️', // clear
        801: '🌤️', // few clouds
        802: '⛅', // scattered clouds
        803: '🌥️', // broken clouds
        804: '☁️'  // overcast clouds
    };

    const firstDigit = Math.floor(weatherId / 100) * 100;
    return weatherEmojis[weatherId] || weatherEmojis[firstDigit] || '🌡️';
}

function getDailyForecasts(forecastList) {
    const dailyForecasts = [];
    const seenDates = new Set();

    for (const forecast of forecastList) {
        const date = forecast.dt_txt.split(' ')[0];
        if (!seenDates.has(date)) {
            seenDates.add(date)
            dailyForecasts.push(forecast);
            if (dailyForecasts.length === 5) break;
        }
    }
    return dailyForecasts;
}

function createForecastCard(forecast) {
    const date = new Date(forecast.dt * 1000);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const emoji = getWeatherEmoji(forecast.weather[0].id);

    return `
        <div class="forecast-item glass-panel">
            <h4>${dayName}</h4>
            <div class="forecast-icon">${emoji}</div>
            <p class="forecast-temp">${Math.round(forecast.main.temp)}°C</p>
            <p class="forecast-desc">${capitalizeFirst(forecast.weather[0].description)}</p>
        </div>
    `;
}

// Loading State Management
function showLoadingState() {
    // Add loading class to container
    document.querySelector('.container').classList.add('loading');
    // You can add a loading spinner or other loading indicators here
}

function hideLoadingState() {
    // Remove loading class from container
    document.querySelector('.container').classList.remove('loading');
}

// Error Handling
function showError(message) {
    // Clear existing weather data
    if (elements.location) elements.location.textContent = message;
    if (elements.temperature) elements.temperature.textContent = '';
    if (elements.description) elements.description.textContent = '';
    if (elements.humidity) elements.humidity.textContent = '';
    if (elements.windSpeed) elements.windSpeed.textContent = '';
    if (elements.feelsLike) elements.feelsLike.textContent = '';
    if (elements.weatherIcon) elements.weatherIcon.innerHTML = '❌';
    if (elements.forecastContainer) elements.forecastContainer.innerHTML = '';

    // Show error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.container').prepend(errorDiv);

    // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export necessary functions for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        handleSearch,
        updateWeatherUI,
        updateForecastUI,
        getWeatherEmoji
    };
}