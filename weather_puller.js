
/**
 * @param {Array<{ 
 *      temp_c: number, 
 *      is_day: number, 
 *      wind_kph: number, 
 *      precip_mm: number, 
 *      snow_cm: number, 
 *      humidity: number, 
 *      cloud: number, 
 *      windchill_c: number, 
 *      heatindex_c: number, 
 *      will_it_rain: number, 
 *      chance_of_rain: number, 
 *      will_it_snow: number, 
 *      chance_of_snow: number 
 *  }[]>} data
 * @returns {Array<number[]>}
 */
function turnIntoMatrix(data) {
    const matrix = [];
    for (const key in data) {
        const value = data[key];
        matrix.push(value);
    }
    return matrix;
}

/**
 * @param {string} location 
 * @returns {Promise<Object | null>} Weather data for the given location or null if the location is invalid
 */
async function getWeatherData(location) {
    const weatherApi = `http://api.weatherapi.com/v1/forecast.json?key=cf0298ffa95d425e8a2155342253001&q=${location}&days=1&aqi=no&alerts=no`;

    const response = await fetch(weatherApi);
    const data = await response.json();

    if (data.error) {
        return null;
    }

    return weatherData(data);
}

function weatherData(data) {
    /**
     * @type {Array<{ 
     *      temp_c: number, 
     *      is_day: number, 
     *      wind_kph: number, 
     *      precip_mm: number, 
     *      snow_cm: number, 
     *      humidity: number, 
     *      cloud: number, 
     *      windchill_c: number, 
     *      heatindex_c: number, 
     *      will_it_rain: number, 
     *      chance_of_rain: number, 
     *      will_it_snow: number, 
     *      chance_of_snow: number 
     *  }[]>}
     */
    let filteredData = [];
    for (const [key, value] of Object.entries(data)) {
        if (key === "current" || key === "location") {
            continue;
        }
        if (key === "forecast") {
            for (const day of value.forecastday) {
                filteredData.push(day.hour);
            }
        }
    }

    // console.log("Filtered data:", filteredData);

    /**
     * @type {Array<{
     *    temp_c: number[],
     *    is_day: number[],
     *    wind_kph: number[],
     *    precip_mm: number[],
     *    snow_cm: number[],
     *    humidity: number[],
     *    cloud: number[],
     *    windchill_c: number[],
     *    heatindex_c: number[],
     *    will_it_rain: number[],
     *    chance_of_rain: number[],
     *    will_it_snow: number[],
     *    chance_of_snow: number[]
     * }>} sequentialData
     */
    let daySequence = {};

    for (const key of Object.keys(filteredData[0][0])) {
        if (key.endsWith("_epoch") || key.endsWith("_f") || key.endsWith("_mph") || key.endsWith("_in") ||
            ["wind_degree", "wind_dir", "pressure_mb", "gust_kph", "dewpoint_c", "vis_km", "vis_miles", "uv", "time", "feelslike_c", "condition"].includes(key)) {
            continue;
        }
        daySequence[key] = [];
    }

    const sequentialData = new Array(filteredData.length).fill(daySequence);

    for (let i = 0; i < filteredData.length; i++) {
        const day = filteredData[i];
        const currentDay = sequentialData[i];
        for (const obj of day) {
            for (const [key, value] of Object.entries(obj)) {
                if (!currentDay.hasOwnProperty(key)) {
                    continue;
                }
                if (key === "condition") {
                    currentDay[key].push(value.text);
                } else {
                    currentDay[key].push(value);
                }
            }
        }
    }

    return sequentialData;
}

// const weather = await (async () => {
//     const weatherData = await getWeatherData("London");
//     console.log(weatherData);
//     return turnIntoMatrix(weatherData);
// })();

// console.log("Weather:", weather);

export { getWeatherData, turnIntoMatrix };
