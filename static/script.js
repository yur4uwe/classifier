<<<<<<< HEAD
const port = "8080"
=======

const server_ip = window.location.origin;
>>>>>>> f13d90f8504f4c0a11db070b397c9475e40e642b

const getNextOutfit = async () => {
    let directory = localStorage.getItem("current_outfit");

    if (!directory) {
<<<<<<< HEAD
        directory = await fetch(`http://localhost:${port}/next-outfit`)
=======
        directory = await fetch(`${server_ip}/next-outfit`)
>>>>>>> f13d90f8504f4c0a11db070b397c9475e40e642b
            .then(response => response.json())

        localStorage.setItem("current_outfit", directory);
    }

<<<<<<< HEAD
    const images = await fetch(`http://localhost:${port}/images/${directory}`)
=======
    const images = await fetch(`${server_ip}/images/${directory}`)
>>>>>>> f13d90f8504f4c0a11db070b397c9475e40e642b
        .then(response => response.json())
        .then(files => files.filter(file => file.endsWith('.jpg') || file.endsWith('.png')));

    const outfitContainer = document.getElementById('outfit-container');
    outfitContainer.classList.add(`directory:${directory}`);
    outfitContainer.innerHTML = '';

    let i = 0;

    for (const image of images) {
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');

        const imageElement = document.createElement('img');
<<<<<<< HEAD
        imageElement.src = `http://localhost:${port}/images/${directory}/${image}`;
=======
        imageElement.src = `${server_ip}/images/${directory}/${image}`;
>>>>>>> f13d90f8504f4c0a11db070b397c9475e40e642b

        const excludeButton = document.createElement('button');
        excludeButton.classList.add('exclude-button');
        excludeButton.innerText = 'Exclude';
        excludeButton.addEventListener('click', () => {
            imageContainer.remove();
        });

        const tags = document.createElement('div');
        tags.classList.add('tags-container');

        let tagsMappingObject = localStorage.getItem("tags_mapping");

        if (!tagsMappingObject) {
            tagsMappingObject = await fetch("../data/tags_mapping.json")
                .then(response => response.json())
            tagsMappingObject = tagsMappingObject["tags"];
            localStorage.setItem("tags_mapping", JSON.stringify(tagsMappingObject));
        } else {
            tagsMappingObject = JSON.parse(tagsMappingObject);
        }

        const tagsMapping = tagsMappingObject;

        for (const tagName in tagsMapping) {
            const tagContainer = document.createElement('div');
            tagContainer.classList.add('tag-container');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('tag-checkbox');
            checkbox.id = `tag-checkbox-${tagName}-${i}`;

            const button = document.createElement('label');
            button.classList.add('tag');
            button.innerHTML = tagName;
            button.setAttribute('for', checkbox.id);

            tagContainer.appendChild(checkbox);
            tagContainer.appendChild(button);


            tags.appendChild(tagContainer);

            i++;
        }

        let typesMappingObject = localStorage.getItem("types_mapping");

        if (!typesMappingObject) {
            typesMappingObject = await fetch("../data/types_mapping.json")
                .then(response => response.json())
            localStorage.setItem("types_mapping", JSON.stringify(typesMappingObject));
        } else {
            typesMappingObject = JSON.parse(typesMappingObject);
        }

        const typesMapping = typesMappingObject;

        const typeSelect = document.createElement('select');
        typeSelect.id = 'type-select-' + image;
        typeSelect.classList.add('type-select');

        for (const type of typesMapping) {
            const option = document.createElement('option');
            option.value = type;
            option.innerText = type;

            typeSelect.appendChild(option);
        }

        imageContainer.appendChild(imageElement);
        imageContainer.appendChild(typeSelect);
        imageContainer.appendChild(tags);
        imageContainer.appendChild(excludeButton);
        outfitContainer.appendChild(imageContainer);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const conditions = document.getElementById('weather');

    const possibleConfigs = await fetch("../data/possible_conditions.json")
        .then(response => response.json())

    for (const config of possibleConfigs) {
        const conditionContainer = document.createElement('div');
        conditionContainer.classList.add('condition');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('condition-checkbox');
        checkbox.id = `condition-checkbox-${possibleConfigs.indexOf(config)}`;
        conditionContainer.appendChild(checkbox);

        const button = document.createElement('button');
        button.classList.add('condition-h4');
        button.setAttribute('for', checkbox.id);
        button.innerText = Array.from(Object.values(config)).join(' | ');
        button.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
        });

        conditionContainer.appendChild(button);

        conditions.appendChild(conditionContainer);

    }

    getNextOutfit();
});

document.getElementById('next-outfit').addEventListener('click', async () => {
    const outfitContainer = document.getElementById('outfit-container');

    const currentOutfit = Array.from(outfitContainer.classList).filter(className => className.startsWith('directory:'))[0].split(':')[1];

    outfitContainer.classList = '';

    const tags = {};
    const types = {};

    document.querySelectorAll('.image-container').forEach(imageContainer => {
        const image = imageContainer.querySelector('img').src.split('/').pop();
        tags[image] = [];

        imageContainer.querySelectorAll('.tag-checkbox').forEach(checkbox => {
            if (checkbox.checked) {
                tags[image].push(checkbox.nextElementSibling.innerText);
            }
        });
    });

    document.querySelectorAll('.type-select').forEach(typeSelect => {
        const image = typeSelect.id.split('-').pop();
        types[image] = typeSelect.value;
    });

    const weatherConfig = [];

    document.querySelectorAll('.condition-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            const condition = checkbox.nextElementSibling.innerText;
            weatherConfig.push(condition);
        }
    });

    const resultBody = JSON.stringify({
        directory: currentOutfit,
        types: types,
        tags: tags,
        weatherConfig: weatherConfig
    });

    console.log(resultBody);

<<<<<<< HEAD
    await fetch(`http://localhost:${port}/submit`, {
=======
    await fetch(`${server_ip}/submit`, {
>>>>>>> f13d90f8504f4c0a11db070b397c9475e40e642b
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: resultBody
    });

<<<<<<< HEAD
    await fetch(`http://localhost:${port}/mark-done`, {
=======
    await fetch(`${server_ip}/mark-done`, {
>>>>>>> f13d90f8504f4c0a11db070b397c9475e40e642b
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentOutfit }) // Ensure the body is correctly formatted as JSON
    });

<<<<<<< HEAD
=======
    document.querySelectorAll(".condition-checkbox").forEach(checkbox => checkbox.checked = false);

>>>>>>> f13d90f8504f4c0a11db070b397c9475e40e642b
    localStorage.removeItem("current_outfit");

    console.log('JSON file has been saved.');

    getNextOutfit();
});