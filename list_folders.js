import fs from 'fs';
import path from 'path';

const directoryPath = "C:\\Users\\Yup4uwe\\Desktop\\NewFolder\\Myprojects\\Recommendation\\images\\";

const directories = fs.readFileSync('./data/directories.json');
const directoriesObject = JSON.parse(directories);

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.error('Unable to scan directory: ' + err);
    }

    const directories = files.filter(file => fs.statSync(path.join(directoryPath, file)).isDirectory());
    const jsonObject = {};

    directories.forEach(dir => {
        if (directoriesObject[dir]) {
            jsonObject[dir] = directoriesObject[dir];
        } else {
            jsonObject[dir] = false;
        }
    });

    fs.writeFile('./data/directories.json', JSON.stringify(jsonObject, null, 2), (err) => {
        if (err) {
            return console.error('Error writing file: ' + err);
        }
        console.log('JSON file has been saved.');
    });
});