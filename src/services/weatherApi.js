import axios from 'axios';

const API_KEY = '791485371b7c030407ca04fd06a53e2f';
const BASE_URL = 'https://api.weatherstack.com';

const weatherApi = axios.create({
  baseURL: BASE_URL,
  params: {
    access_key: API_KEY,
  },
});

export const getCurrentWeather = async (query) => {
  try {
    const response = await weatherApi.get('/current', {
      params: { query },
    });
    if (response.data.error) {
      throw new Error(response.data.error.info);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
};

export const getHistoricalWeather = async (query, date) => {
  try {
    const response = await weatherApi.get('/historical', {
      params: { query, historical_date: date },
    });
    if (response.data.error) {
      throw new Error(response.data.error.info);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching historical weather:', error);
    throw error;
  }
};

export const getAutocompleteSuggestions = async (query) => {
  try {
    const response = await weatherApi.get('/autocomplete', {
      params: { query },
    });
    if (response.data.error) {
      throw new Error(response.data.error.info);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching autocomplete suggestions:', error);
    throw error;
  }
};

export const getForecast = async (query, days = 7) => {
  try {
    const response = await weatherApi.get('/forecast', {
      params: { query, forecast_days: days },
    });
    if (response.data.error) {
      throw new Error(response.data.error.info);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw error;
  }
};

export default weatherApi;
