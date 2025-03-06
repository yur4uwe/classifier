// Weather forecast API URL
function turnIntoMatrix(data) {
    const matrix = [];
    for (const key of Object.keys(data)) {
        const value = data[key];
        console.log(key);
        console.log(value);
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
    let filteredData = [];
    for (const [key, value] of Object.entries(data)) {
        if (key === "current" || key === "location") {
            continue;
        }
        if (key === "forecast") {
            filteredData = value.forecastday[0].hour;
        }
    }

    let restructuredData = {};

    for (const key of Object.keys(filteredData[0])) {
        if (key.endsWith("_epoch") || key.endsWith("_f") || key.endsWith("_mph") || key.endsWith("_in") ||
            ["wind_degree", "wind_dir", "pressure_mb", "gust_kph", "dewpoint_c", "vis_km", "vis_miles", "uv", "time", "feelslike_c", "condition"].includes(key)) {
            continue;
        }
        restructuredData[key] = [];
    }

    for (const obj of filteredData) {
        for (const [key, value] of Object.entries(obj)) {
            if (!restructuredData.hasOwnProperty(key)) {
                continue;
            }
            if (key === "condition") {
                restructuredData[key].push(value.text);
            } else {
                restructuredData[key].push(value);
            }
        }
    }
    return restructuredData;
}

// const weather = await (async () => {
//     const weatherData = await getWeatherData();
//     console.log(weatherData);
//     return turnIntoMatrix(weatherData);
// })();

// console.log("Weather:", weather);

export { getWeatherData };
