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

const tolerance = {
    temp_c: {
        range: 2,
        type: "float"
    },
    is_day: {
        type: "non-tolerant"
    },
    wind_kph: {
        range: 2,
        type: "float-non-negative"
    },
    precip_mm: {
        range: 2,
        type: "float-non-negative"
    },
    snow_cm: {
        range: 2,
        type: "float-non-negative"
    },
    humidity: {
        range: 5,
        type: "int"
    },
    cloud: {
        range: 5,
        type: "int"
    },
    windchill_c: {
        range: 2,
        type: "float"
    },
    heatindex_c: {
        range: 2,
        type: "float"
    },
    will_it_rain: {
        type: "non-tolerant"
    },
    chance_of_rain: {
        range: 5,
        type: "int"
    },
    will_it_snow: {
        type: "non-tolerant"
    },
    chance_of_snow: {
        range: 5,
        type: "int"
    }
};

/**
 * @param {DailyWeather} data
 * @returns {Array<number[]>}
 */
function turnIntoMatrix(data, augment = false) {
    const matrix = [];
    for (const key in data) {
        /**
         * @type {number[]} values
         */
        let values = data[key];
        const type = tolerance[key].type.split("-");
        if (augment && type.join("-") !== "non-tolerant") {

            for (let i = 0; i < values.length; i++) {
                if (key === "precip_mm" && data["will_it_rain"][i] === 0 ||
                    key === "snow_cm" && data["will_it_snow"][i] === 0 ||
                    key === "chance_of_rain" && data["will_it_rain"][i] === 0 ||
                    key === "chance_of_snow" && data["will_it_snow"][i] === 0) {
                    values[i] = 0;
                    continue;
                }

                const error = (Math.random() * 2 - 1) * tolerance[key].range;
                if (type[0] === "int") {
                    if (values[i] + Math.round(error) < 0) {
                        values[i] = 0;
                    } else if (values[i] + Math.round(error) > 100) {
                        values[i] = 100;
                    } else {
                        values[i] += Math.round(error);
                    }
                } else if (type[0] === "float") {
                    values[i] += error;

                    if (type.join("-") === "float-non-negative" && values[i] < 0) {
                        values[i] = 0;
                    }

                    values[i] = Math.round(values[i] * 10) / 10; // Round to 1 decimal place
                }
            }

            matrix.push(values);
        } else {
            matrix.push(values);
        }
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
     * @type {Array<DailyWeather[]>}
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

function printWeatherData(data, structure = "object") {
    if (structure === "object") {
        for (const key in data) {
            console.log(key, ":", data[key]);
        }
    } else if (structure === "matrix") {
        for (const values of data) {
            console.log(values);
        }
    }
}

// (async () => {
//     const weatherData = await getWeatherData("London");
//     // console.log("Raw Weather Data (" + typeof weatherData[0] + "):");
//     // printWeatherData(weatherData[0]);
//     const augmentedData = turnIntoMatrix(weatherData[0], true);
//     // console.log("Augmented Data (" + typeof augmentedData + "):");
//     // printWeatherData(augmentedData, "matrix");
//     const notAugmentedData = turnIntoMatrix(weatherData[0], false);
//     // console.log("Not Augmented Data (" + typeof augmentedData + "):");
//     // printWeatherData(notAugmentedData, "matrix");

//     for (let i = 0; i < augmentedData.length; i++) {
//         for (let j = 0; j < augmentedData[i].length; j++) {
//             if (augmentedData[i][j] !== notAugmentedData[i][j]) {
//                 console.log("Augmented data differs from not augmented data at index", i, j);
//             }
//         }
//         // console.log("Augmented data    :", augmentedData[i].join(", "));
//         // console.log("Not augmented data:", notAugmentedData[i].join(", "));
//     }
// })();

export { getWeatherData, turnIntoMatrix };
