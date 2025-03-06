import fs from 'fs';
import { getWeatherData } from './weather_puller.js';

const cache = {};

const cities = fs.readFileSync('data/list.txt', 'utf8').split('\n');

const cityChunks = [];
const chunkSize = 1000;

for (let i = 0; i < cities.length; i += chunkSize) {
    cityChunks.push(cities.slice(i, i + chunkSize));
}

for (const chunk of cityChunks) {
    const weatherDataPromises = chunk.map(city => getWeatherData(city));
    const weatherDataArray = await Promise.all(weatherDataPromises);

    for (let i = 0; i < chunk.length; i++) {
        if (weatherDataArray[i] === null) {
            continue;
        }
        cache[chunk[i]] = weatherDataArray[i];
    }

    console.log(`Processed ${cityChunks.indexOf(chunk)} cities`);
}

fs.writeFileSync('data/weather.json', JSON.stringify(cache, null, 2));