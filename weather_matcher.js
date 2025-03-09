import fs from 'fs';
import readline from 'readline';
import { getWeatherData } from './weather_puller.js';


/**
 * @typedef {{ 
 *      temp_c: number[], 
 *      is_day: number[], 
 *      wind_kph: number[], 
 *      precip_mm: number[], 
 *      snow_cm: number[], 
 *      humidity: number[], 
 *      cloud: number[], 
 *      windchill_c: number[], 
 *      heatindex_c: number[], 
 *      will_it_rain: number[], 
 *      chance_of_rain: number[], 
 *      will_it_snow: number[], 
 *      chance_of_snow: number[] 
 *  }} DailyWeather
 */

/**
 * @typedef {Object[][]} dayConditions
 */

class WeatherMatcher {
    constructor() {
        this.thresholds = {
            temperature: {
                Freezing: [-50, 0],
                Cold: [0, 10],
                Cool: [10, 15],
                Mild: [15, 20],
                Warm: [20, 25],
                Hot: [25, 30],
                'Very Hot': [30, 50]
            },
            humidity: {
                Dry: [0, 40],
                'Moderate Humidity': [40, 60],
                Humid: [60, 75],
                Muggy: [75, 100]
            },
            precipitation: {
                'No Precipitation': [0, 0],
                Drizzle: [0.1, 2],
                Rain: [2, 10],
                'Heavy Rain': [10, 50],
                Thunderstorm: [10, 50],
                Snow: [0.1, 5],
                'Heavy Snow': [5, 50],
                Sleet: [0.1, 5]
            },
            wind: {
                'No Wind': [0, 0],
                Calm: [0.1, 10],
                Breezy: [10, 20],
                Windy: [20, 30],
                Gale: [30, 100]
            },
            sky: {
                Clear: [0, 10],
                'Partly Cloudy': [10, 30],
                'Mostly Cloudy': [30, 70],
                Overcast: [70, 100],
                Indoor: null
            }
        };
    }

    _matchesCondition(actualValue, descriptor, category) {
        if (descriptor === 'Indoor' || category === 'Indoor') return true;

        if (descriptor === "Foggy") {
            return this._matchesCondition(actualValue, "Overcast", "sky");
        }

        const [min, max] = this.thresholds[category][descriptor];

        // Check if the actual value is within the range of the descriptor
        if (actualValue >= min && actualValue <= max) {
            return true;
        }

        // Check neighboring conditions
        const descriptors = Object.keys(this.thresholds[category]);
        const currentIndex = descriptors.indexOf(descriptor);

        // Check previous descriptor
        if (currentIndex > 0) {
            const [prevMin, prevMax] = this.thresholds[category][descriptors[currentIndex - 1]];
            if (actualValue >= (prevMax + prevMin) / 2 && actualValue <= prevMax) {
                return true;
            }
        }

        // Check next descriptor
        if (currentIndex < descriptors.length - 1) {
            const nextThreshold = this.thresholds[category][descriptors[currentIndex + 1]];
            if (nextThreshold === null) return false;
            const [nextMin, nextMax] = nextThreshold;
            if (actualValue >= nextMin && actualValue <= (nextMax + nextMin) / 2) {
                return true;
            }
        }

        return false;
    }

    // Determine precipitation type from numerical values
    _matchPrecipitationType(precipMm, snowCm, targetPrecip) {
        let precipType;
        if (snowCm > 0) {
            precipType = snowCm < 5 ? 'Snow' : 'Heavy Snow';
        } else if (precipMm === 0) {
            precipType = 'No Precipitation';
        } else if (precipMm <= 2) {
            precipType = 'Drizzle';
        } else if (precipMm <= 10) {
            precipType = 'Rain';
        } else {
            precipType = precipMm < 50 ? 'Heavy Rain' : 'Thunderstorm';
        }

        // Check if the precipType matches the targetPrecip directly
        if (precipType === targetPrecip) {
            return true;
        } else {
            return false;
        }
    }

    _getDescriptorFromValue(value, category) {
        for (const descriptor of Object.keys(this.thresholds[category])) {
            const [min, max] = this.thresholds[category][descriptor];
            if (value >= min && value <= max) return descriptor;
        }
    }

    _getPrecipitationFromValue(precipMm, snowCm) {
        if (snowCm > 0) {
            return snowCm < 5 ? 'Snow' : 'Heavy Snow';
        } else if (precipMm === 0) {
            return 'No Precipitation';
        } else if (precipMm <= 2) {
            return 'Drizzle';
        } else if (precipMm <= 10) {
            return 'Rain';
        } else {
            return precipMm < 50 ? 'Heavy Rain' : 'Thunderstorm';
        }
    }

    // Main matching function
    /**
     * 
     * @param {DailyWeather} numericalData 
     * @param {string[]} weatherDescriptor 
     * @returns 
     */
    _matchConditions(numericalData, weatherDescriptor) {
        // Extract relevant fields ignoring season (index 1)
        const [
            targetTemp,
            targetHumidity,
            targetPrecip,
            targetWind,
            targetSky
        ] = weatherDescriptor;

        let matched = 0;
        let dayIsMatched = true;

        // Assuming data is hourly (24 entries)
        for (let hour = 0; hour < 24; hour++) {
            const tempMatch = this._matchesCondition(
                numericalData.temp_c[hour],
                targetTemp,
                'temperature'
            );

            const humidityMatch = this._matchesCondition(
                numericalData.humidity[hour],
                targetHumidity,
                'humidity'
            );

            const precipMatch = this._matchPrecipitationType(
                numericalData.precip_mm[hour],
                numericalData.snow_cm[hour],
                targetPrecip
            );

            const windMatch = this._matchesCondition(
                numericalData.wind_kph[hour],
                targetWind,
                'wind'
            );

            const skyMatch = this._matchesCondition(
                numericalData.cloud[hour],
                targetSky,
                'sky'
            );

            if (tempMatch && humidityMatch && precipMatch && windMatch && skyMatch) {
                matched++;
            } else if (numericalData.is_day[hour]) {
                dayIsMatched = false;
            }
        }

        return { matched, dayIsMatched };
    }

    /**
     * 
     * @param {{string : DailyWeather[]}} matches 
     * @param {DailyWeather} numericalData 
     * @param {string[]} weatherDescriptors 
     * @param {string[][]} closeEnoughDescriptors
     * @param {string} city 
     */
    matchWeatherOverAllConditions(matches, numericalData, weatherDescriptors, closeEnoughDescriptors, city) {
        for (const descriptor of weatherDescriptors) {
            const descriptorString = descriptor.join(' | ');
            const { matched, dayIsMatched } = this._matchConditions(numericalData, descriptor);

            if (dayIsMatched && matched > 0) {
                matches[descriptorString].push(numericalData);
                continue;
            }

            for (const closeDescriptorString of closeEnoughDescriptors[descriptorString]) {
                const closeDescriptor = closeDescriptorString.split(' | ');
                const { matched: closeMatched, dayIsMatched } = this._matchConditions(numericalData, closeDescriptor);

                if (dayIsMatched && closeMatched > 0) {
                    matches[descriptorString].push(numericalData);
                }
            }
        }
    }

    /**
     * 
     * @param {dayConditions} numericalData 
     */
    matchConditionsOverWeather(numericalData) {
        const dayDescriptors = []

        for (let hour = 0; hour < 24; hour++) {
            const tempDescriptor = this._getDescriptorFromValue(
                numericalData.temp_c[hour],
                'temperature'
            );
            const humidityDescriptor = this._getDescriptorFromValue(
                numericalData.humidity[hour],
                'humidity'
            );
            const precipType = this._getPrecipitationFromValue(
                numericalData.precip_mm[hour],
                numericalData.snow_cm[hour]
            );
            const windDescriptor = this._getDescriptorFromValue(
                numericalData.wind_kph[hour],
                'wind'
            );
            const skyDescriptor = this._getDescriptorFromValue(
                numericalData.cloud[hour],
                'sky'
            );

            dayDescriptors.push([tempDescriptor, humidityDescriptor, precipType, windDescriptor, skyDescriptor].join(' | '));
        }

        const descriptorsFrequency = new Map();
        let bestDescriptor = null;

        for (let i = 0; i < dayDescriptors.length; i++) {
            const descriptor = dayDescriptors[i];

            if (descriptorsFrequency.has(descriptor)) {
                descriptorsFrequency.set(descriptor, descriptorsFrequency.get(descriptor) + 1);

                if (bestDescriptor === null || descriptorsFrequency.get(descriptor) > descriptorsFrequency.get(bestDescriptor)) {
                    bestDescriptor = descriptor;
                }
            } else {
                descriptorsFrequency.set(descriptor, 1);
            }
        }

        return bestDescriptor;
    }
}

const matcher = new WeatherMatcher();

export { matcher };