import fs from 'fs';
import { getWeatherData } from './weather_puller.js';

const cities = fs.readFileSync('data/list.txt', 'utf8').split('\n');

const cityChunks = [];
const chunkSize = 100;

for (let i = 0; i < cities.length; i += chunkSize) {
    cityChunks.push(cities.slice(i, i + chunkSize));
}

(async () => {
    console.log('Caching weather data...');
    console.log(`Total cities: ${cities.length}`);
    console.log(`Total chunks: ${cityChunks.length}`);
    console.log(`Chunk size: ${chunkSize}`);
    for (let i = 0; i < cityChunks.length; i++) {
        const chunk = cityChunks[i];
        const weatherDataPromises = chunk.map(city => getWeatherData(city));
        const weatherDataArray = await Promise.all(weatherDataPromises);

        const cache = {};

        for (let j = 0; j < chunk.length; j++) {
            if (weatherDataArray[j] === null) {
                continue;
            }
            cache[chunk[j]] = weatherDataArray[j];
        }

        // Append the processed chunk to the file
        fs.appendFileSync('data/weather.txt', JSON.stringify(cache) + '\n');

        if (i % (cityChunks.length / 50) === 0) {
            console.log(`Processed ${(i + 1) * chunkSize} cities`);
        }

    }
})();