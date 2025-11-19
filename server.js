import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';


// Same as "require('dotenv').config()"
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// City configurations
const CITIES = {
  berlin: {
    name: 'Berlin',
    country: 'Germany',
    timezone: 'Europe/Berlin',
    lat: 52.52,
    lon: 13.405
  },
  toronto: {
    name: 'Toronto',
    country: 'Canada',
    timezone: 'America/Toronto',
    lat: 43.6532,
    lon: -79.3832
  },
  kualalumpur: {
    name: 'Kuala Lumpur',
    country: 'Malaysia',
    timezone: 'Asia/Kuala_Lumpur',
    lat: 3.1390,
    lon: 101.6869
  }
};

// Get current time for a city
app.get('/api/time/:city', (req, res) => {
  const city = req.params.city.toLowerCase();
  const cityConfig = CITIES[city];

  if (!cityConfig) {
    return res.status(404).json({ error: 'City not found' });
  }

  try {
    // Get current time in the city's timezone
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
      timeZone: cityConfig.timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const timeOnly = now.toLocaleString('en-US', {
      timeZone: cityConfig.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    res.json({
      city: cityConfig.name,
      country: cityConfig.country,
      timezone: cityConfig.timezone,
      datetime: timeString,
      time: timeOnly,
      timestamp: now.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get time' });
  }
});

// Get weather for a city
app.get('/api/weather/:city', async (req, res) => {
  const city = req.params.city.toLowerCase();
  const cityConfig = CITIES[city];

  if (!cityConfig) {
    return res.status(404).json({ error: 'City not found' });
  }

  // Get the API key from the environment variables
  const apiKey = process.env.OPENWEATHER_API_KEY;
  // console.log("API key: ", apiKey);

  if (!apiKey) {
    // Return mock data if API key is not set
    console.log("API key is not set, returning mock data...");
    return res.json({
      city: cityConfig.name,
      country: cityConfig.country,
      temperature: 22,
      description: 'Partly cloudy',
      humidity: 65,
      windSpeed: 5.5,
      icon: '02d',
      feelsLike: 24
    });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${cityConfig.lat}&lon=${cityConfig.lon}&appid=${apiKey}&units=metric`;
    const response = await axios.get(url);

    res.json({
      city: cityConfig.name,
      country: cityConfig.country,
      temperature: Math.round(response.data.main.temp),
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed,
      icon: response.data.weather[0].icon,
      feelsLike: Math.round(response.data.main.feels_like),
      pressure: response.data.main.pressure
    });
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Get all cities data at once
app.get('/api/cities', async (req, res) => {
  try {
    const cities = Object.keys(CITIES);
    const promises = cities.map(async (city) => {
      const [timeRes, weatherRes] = await Promise.all([
        fetch(`http://localhost:${PORT}/api/time/${city}`).then(r => r.json()),
        fetch(`http://localhost:${PORT}/api/weather/${city}`).then(r => r.json())
      ]);

      return {
        city: city,
        time: timeRes,
        weather: weatherRes
      };
    });

    const data = await Promise.all(promises);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

