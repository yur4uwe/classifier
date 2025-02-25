import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors("*"));

const dirname = "C:\\Users\\Yup4uwe\\Desktop\\NewFolder\\Myprojects\\Recommendation\\classifier\\";
const directoryPath = path.join(dirname, "..", 'images');

// Serve static files from the "images" directory
app.use('/images', express.static(directoryPath));
app.use(express.static(path.join(dirname, 'static')));
app.use("/data", express.static(path.join(dirname, 'data')));

app.get('/', (req, res) => {
    res.sendFile(path.join(dirname, "static", 'index.html'));
});

app.get("/next-outfit", (req, res) => {
    fs.readFile(path.join(dirname, 'data', 'directories.json'), (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading file' });
        }

        const directories = JSON.parse(data);

        fs.readFile(path.join(dirname, 'data', 'pending.json'), (err, pendingData) => {
            if (err) {
                return res.status(500).json({ error: 'Error reading pending file' });
            }

            const pending = JSON.parse(pendingData);
            let nextOutfit = null;
            let numOfClassified = 0;

            for (const directory in directories) {
                if (!directories[directory] && !pending.includes(directory)) {
                    nextOutfit = directory;
                    pending.push(directory);
                    break;
                }
                if (directories[directory]) {
                    numOfClassified++;
                }
            }

            fs.writeFile(path.join(dirname, 'data', 'pending.json'), JSON.stringify(pending, null, 4), (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error writing pending file' });
                }

                console.log(`Classified ${numOfClassified} out of ${Object.keys(directories).length} outfits`);
                res.json(nextOutfit);
            });
        });
    });
});

app.get("/images/:directory", (req, res) => {
    const directory = req.params.directory;
    const directoryPath = path.join(dirname, "..", 'images', directory);

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to scan directory' });
        }

        const images = files.filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
        res.json(images);
    });
});

app.post('/mark-done', (req, res) => {
    const { currentOutfit } = req.body;

    fs.readFile(path.join(dirname, 'data', 'directories.json'), (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading file' });
        }

        const directories = JSON.parse(data);
        directories[currentOutfit] = true;

        fs.writeFile(path.join(dirname, 'data', 'directories.json'), JSON.stringify(directories, null, 4), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error writing file' });
            }

            fs.readFile(path.join(dirname, 'data', 'pending.json'), (err, pendingData) => {
                if (err) {
                    return res.status(500).json({ error: 'Error reading pending file' });
                }

                let pending = JSON.parse(pendingData);
                pending = pending.filter(outfit => outfit !== currentOutfit);

                fs.writeFile(path.join(dirname, 'data', 'pending.json'), JSON.stringify(pending, null, 4), (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error writing pending file' });
                    }

                    res.status(200).json({ message: 'JSON file has been saved.' });
                });
            });
        });
    });
});

app.post("/submit", (req, res) => {
    const { directory: outfit, types, tags, weatherConfig } = req.body;

    fs.readFile(path.join(dirname, 'data', 'results.json'), (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading file' });
        }

        const results = JSON.parse(data);
        results.push({ outfit, types, tags, weatherConfig });

        fs.writeFile(path.join(dirname, 'data', 'results.json'), JSON.stringify(results, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error writing file' });
            }
            res.status(200).json({ message: 'JSON file has been saved.' });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});