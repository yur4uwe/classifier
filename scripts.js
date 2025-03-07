import { matcher } from './weather_matcher.js';
import fs from 'fs';

async function findWeatherDescriptors() {
    const descriptorsObj = JSON.parse(fs.readFileSync('data/possible_conditions.json'));
    const descriptors = [];

    for (const descriptor of descriptorsObj) {
        const descArr = [];

        for (const key of Object.keys(descriptor)) {
            if (key === 'season') {
                continue;
            }
            descArr.push(descriptor[key]);
        }

        descriptors.push(descArr);
    }

    let citiesRead = 0;
    let citiesDropped = 0;
    const matching = Object.fromEntries(descriptors.map((descriptor) => [descriptor.join(" | "), []]));

    console.log('Matching weather conditions...');

    const rl = readline.createInterface({
        input: fs.createReadStream('data/weather.json'),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.trim() === '') continue;

        // There is error parsing: SyntaxError: Unexpected end of JSON input
        // need to append lines until valid as json has indentation
        const weatherData = JSON.parse(line);

        for (const city in weatherData) {
            const numericalData = weatherData[city];

            if (!numericalData) {
                citiesDropped++;
                continue;
            }

            for (const day of numericalData) {
                citiesRead++;
                matcher.matchWeatherOverAllConditions(matching, day, descriptors, city);
            }
        }
    }

    console.log(`Read ${citiesRead} cities, dropped ${citiesDropped}`);

    for (const descriptor in matching) {
        console.log(`\n${descriptor} (${matching[descriptor].length} matches):`);
        for (const match of matching[descriptor]) {
            console.log(`  ${match.city}`);
        }
    }

    fs.writeFileSync('data/matching.json', JSON.stringify(matching, null, 2));
}

async function matchConditions() {
    const rawPresetConditions = JSON.parse(fs.readFileSync('data/possible_conditions.json'));
    const presetConditions = [];
    for (const condition of rawPresetConditions) {
        const conditionArr = [];
        for (const key of Object.keys(condition)) {
            if (key === 'season') {
                continue;
            }
            conditionArr.push(condition[key]);
        }
        presetConditions.push(conditionArr);
    }

    const actualConditions = JSON.parse(fs.readFileSync('data/condition_types.json'));
    const closeEnough = {};

    for (const condition of presetConditions) {
        const conditionName = condition.join(" | ");
        closeEnough[conditionName] = [];
    }

    console.log('Matching conditions...');

    for (const condition in closeEnough) {
        const conditionArr = condition.split(" | ");

        for (const actual in actualConditions) {
            const actualArr = actual.split(" | ");
            let matches = 0;

            for (let i = 0; i < conditionArr.length; i++) {
                if (conditionArr[i] === actualArr[i]) {
                    matches++;
                }
            }

            if (matches >= conditionArr.length - 1) {
                closeEnough[condition].push(actual);
            }
        }
    }

    console.log('Close enough matches:');
    for (const condition in closeEnough) {
        console.log(`\n+-----------------+\n${condition}:`);
        for (const match of closeEnough[condition]) {
            console.log(`  ${match}`);
        }
    }
}

async function descriptorsCount() {
    const matchingFile = fs.readFileSync("data/matching.json", "utf8");
    const matching = JSON.parse(matchingFile);

    for (const descriptor in matching) {
        console.log(`${descriptor} (${matching[descriptor].length} matches)`);
    }
}

async function descriptorCreator() {
    const deducedConditions = {};

    const rl = readline.createInterface({
        input: fs.createReadStream('data/weather.json'),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.trim() === '') continue;

        const weatherData = JSON.parse(line);

        for (const city in weatherData) {
            const numericalData = weatherData[city];

            if (!numericalData) {
                continue;
            }

            for (const day of numericalData) {
                const bestDescriptor = matcher.matchConditionsOverWeather(day);
                if (bestDescriptor) {
                    if (!deducedConditions[bestDescriptor]) {
                        deducedConditions[bestDescriptor] = 0;
                    }
                    deducedConditions[bestDescriptor]++;
                }
            }
        }
    }

    fs.writeFileSync('data/condition_types.json', JSON.stringify(deducedConditions, null, 2));

    for (const cond in deducedConditions) {
        console.log(`${cond}: ${deducedConditions[cond]}`);
    }
}

matchConditions();