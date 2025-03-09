import { matcher } from './weather_matcher.js';
import { turnIntoMatrix } from './weather_puller.js';
import readline from 'readline';
import fs from 'fs';

function customStringifyReplacer(key, value) {
    if (Array.isArray(value) &&
        value.every(item => typeof item !== 'object' && typeof item !== 'array')
    ) {
        return JSON.stringify(value);
    }
    return value;
}

function customStringify(obj, replacer, space) {
    const jsonString = JSON.stringify(obj, replacer, space);
    return jsonString.replace(/"(\[.*?\])"/g, "$1");
}

function getRawDataForDescriptor(descriptor, matching) {
    /**
     * @type {Object[]} matchingConditions
     */
    const matchingConditions = matching[descriptor];
    if (!matchingConditions || matchingConditions.length === 0) {
        console.log("No matching conditions for descriptor: ", descriptor);
        console.log("Matching conditions for descriptor: ", matchingConditions);
        console.log("+-------------------------------------------------------+");
        return null;
    }

    try {
        const rawData = matchingConditions.reduce((accumulated, weatherConditions) => {
            if (!weatherConditions) {
                return accumulated;
            }
            if (accumulated.length >= 1000) {
                return accumulated;
            }
            accumulated.push(turnIntoMatrix(weatherConditions));
            return accumulated;
        }, []);

        return rawData;
    } catch (error) {
        console.log("Error parsing descriptor: ", descriptor);
        console.log("Matching Conditions: ", matchingConditions);
        console.log("Matching Conditions Length: ", matchingConditions.length);
        console.log("Matching Conditions Type: ", typeof matchingConditions);
        console.log("+-------------------------------------------------------+");
        throw error;
    }
}

function parseDescriptor(descriptorString) {
    /**
     * @type {string[]} descArr
     */
    const descArr = descriptorString.split(" | ");

    const season = [
        "Winter",
        "Spring",
        "Summer",
        "Autumn",
        "All Seasons",
        "Indoor"
    ]

    const descriptor = descArr.reduce((accumulated, descr, index) => {
        if (season.includes(descr) && index === 1) {
            return accumulated;
        }
        if (descr === "Indoor") {
            accumulated.push("Clear");
            return accumulated;
        }
        if (descr === "Foggy") {
            accumulated.push("Overcast");
            return accumulated;
        }
        accumulated.push(descr);
        return accumulated;
    }, []).join(" | ");

    return descriptor;
}

function isEverythingInPlace() {
    const opposite = JSON.parse(fs.readFileSync('data/opposite.json'));
    const conditions = JSON.parse(fs.readFileSync('data/possible_conditions.json'));

    console.log('Checking for non-existent conditions...:');

    for (const originalCondition in opposite) {
        if (!conditions.includes(originalCondition)) {
            console.log('Non-existent condition: ', originalCondition);
            return false;
        }

        const oppositeCondition = opposite[originalCondition];

        if (!conditions.includes(oppositeCondition)) {
            console.log('Non-existent opposite condition: ', oppositeCondition);
            return false;
        }
    }

    fs.writeFileSync('data/possible_conditions.json', JSON.stringify(conditions, null, 4));

    return true;
}

async function findWeatherDescriptors() {
    /**
     * @type {string[][]} descriptors
     */
    const descriptors = JSON.parse(fs.readFileSync('data/possible_conditions.json')).map((descriptor) => {
        return descriptor.split(" | ");
    });
    const closeEnough = JSON.parse(fs.readFileSync('data/close_enough.json'));


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

                matcher.matchWeatherOverAllConditions(matching, day, descriptors, closeEnough, city);
            }
        }
    }

    console.log(`Read ${citiesRead} cities, dropped ${citiesDropped}`);

    for (const descriptor in matching) {
        console.log(`\n${descriptor} (${matching[descriptor].length} matches):`);
    }

    fs.writeFileSync('data/matching.json', JSON.stringify(matching, customStringifyReplacer, 2));
}

async function matchConditions() {
    const presetConditions = JSON.parse(fs.readFileSync('data/possible_conditions.json')).map((descriptor) => {
        return descriptor.split(" | ");
    });

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

    // fs.writeFileSync('data/close_enough.json', JSON.stringify(closeEnough, null, 2));
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

function outfitCounter() {
    const outfits = fs.readdirSync('outfits');
    console.log(`Outfits: ${outfits.length}`);

    for (const outfit of outfits) {
        const conditions = JSON.parse(fs.readFileSync('outfits/' + outfit));
        console.log(`${outfit}: ${conditions.length} conditions`);
    }
}

function rawData() {
    const results = JSON.parse(fs.readFileSync('data/results (2).json'));
    const tags = JSON.parse(fs.readFileSync('data/tags_mapping.json')).tags;
    const types = JSON.parse(fs.readFileSync('data/types_mapping.json'));
    const matching = JSON.parse(fs.readFileSync('data/matching.json'));
    const opposite = JSON.parse(fs.readFileSync('data/opposite.json'));

    for (let i = 0; i < results.length; i++) {
        const outfit = results[i];
        const outfitData = [];

        const typesData = [];
        for (const type of Object.values(outfit.types)) {
            if (types[type] === undefined || types[type] === null) {
                continue;
            }
            typesData.push(types[type] + 1);
        }
        outfitData.push(typesData);

        const tagsData = [];
        for (const imageName in outfit.tags) {
            const clothingTags = [];

            for (const tag of outfit.tags[imageName]) {
                clothingTags.push(tags[tag] + 1);
            }

            tagsData.push(clothingTags);
        }
        outfitData.push(tagsData);

        const allPositiveConditionsForOneOutfit = [];
        const allNegativeConditionsForOneOutfit = [];

        for (let descriptorString of outfit.weatherConfig) {

            const descriptor = parseDescriptor(descriptorString);

            const oppositeDescriptor = opposite[descriptor];

            const rawPosData = getRawDataForDescriptor(descriptor, matching);
            const rawNegData = getRawDataForDescriptor(oppositeDescriptor, matching);

            if (!rawPosData || !rawNegData) {
                continue;
            }

            for (const condition of rawPosData) {
                const rawCondition = []

                for (let cond of condition) {
                    cond = JSON.parse(cond);
                    rawCondition.push(cond);
                }

                const sample = [...outfitData, rawCondition];
                if (typeof rawCondition[0] === 'string') {
                    console.log('Condition is string');
                    throw new Error('Condition is string');
                }
                allPositiveConditionsForOneOutfit.push(sample);
            }

            for (const condition of rawNegData) {
                const rawCondition = []

                for (let cond of condition) {
                    cond = JSON.parse(cond);
                    rawCondition.push(cond);
                }

                const sample = [...outfitData, rawCondition];
                if (typeof rawCondition[0] === 'string') {
                    console.log('Condition is string');
                    throw new Error('Condition is string');
                }
                allNegativeConditionsForOneOutfit.push(sample);
            }

            // console.log("Amount of conditions for this outfit: ", allPositiveConditionsForOneOutfit.length);
        }


        console.log("Working on outfit: ", outfit.outfit);
        console.log("Amount of conditions for this outfit: ", allPositiveConditionsForOneOutfit.length);


        fs.writeFileSync("outfits/pos/" + outfit.outfit + ".json", customStringify(allPositiveConditionsForOneOutfit, customStringifyReplacer, 2));
        fs.writeFileSync("outfits/neg/" + outfit.outfit + ".json", customStringify(allNegativeConditionsForOneOutfit, customStringifyReplacer, 2));
    }
}

// findWeatherDescriptors();
// matchConditions();
// descriptorsCount();
rawData();
// outfitCounter();
// console.log(isEverythingInPlace());