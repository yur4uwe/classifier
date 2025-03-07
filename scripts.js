import { matcher } from './weather_matcher.js';
import { turnIntoMatrix } from './weather_puller.js';
import readline from 'readline';
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
        input: fs.createReadStream('data/weather.txt'),
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

    fs.writeFileSync('data/close_enough.json', JSON.stringify(closeEnough, null, 2));
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
        input: fs.createReadStream('data/weather.txt'),
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

function rawData() {
    const results = JSON.parse(fs.readFileSync('data/results.json'));
    const tags = JSON.parse(fs.readFileSync('data/tags_mapping.json')).tags;
    const types = JSON.parse(fs.readFileSync('data/types_mapping.json'));
    const close_enough = JSON.parse(fs.readFileSync('data/close_enough.json'));
    const matching = JSON.parse(fs.readFileSync('data/matching.json'));

    for (const outfit of results) {
        const outfitData = [];

        const typesData = [];
        for (const type of Object.values(outfit.types)) {
            typesData.push(types[type]);
        }
        outfitData.push(typesData);

        const tagsData = [];
        for (const imageName in outfit.tags) {
            const clothingTags = [];

            for (const tag of outfit.tags[imageName]) {
                clothingTags.push(tags[tag]);
            }

            tagsData.push(clothingTags);
        }
        outfitData.push(tagsData);

        for (let descriptor of outfit.weatherConfig) {

            /**
             * @type {string[]}
             */
            const descArr = descriptor.split(" | ");

            descriptor = [descArr[0], ...descArr.splice(2, descArr.length - 2)].join(" | ");

            const acceptable_descriptors = [descriptor];

            const closeDescriptors = close_enough[descriptor];

            if (!closeDescriptors) {
                continue;
            }

            closeDescriptors.forEach((closeDescriptor) => {
                acceptable_descriptors.push(closeDescriptor);
            });

            const numericalData = acceptable_descriptors.map((descriptor) => {
                return matching[descriptor];
            });

            const rawData = [];

            for (const descriptorSuitableConditions of numericalData) {
                if (!descriptorSuitableConditions) {
                    continue;
                }
                for (const weatherConditions of descriptorSuitableConditions) {
                    if (!weatherConditions) {
                        continue;
                    }
                    rawData.push(turnIntoMatrix(weatherConditions));
                }
            }

            const allConditionsForOneOutfit = [];

            for (const condition of rawData) {
                const sample = [...outfitData, condition];

                // if (rawData.indexOf(condition) === 0) {
                //     console.log(condition);
                //     console.log(sample);
                // }

                allConditionsForOneOutfit.push(sample);
            }

            fs.writeFileSync("outfits/" + outfit.outfit + ".json", JSON.stringify(allConditionsForOneOutfit, null, 2));
        }
    }
}

findWeatherDescriptors();
// matchConditions();

// rawData();