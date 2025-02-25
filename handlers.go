package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

func readJSONFile(filePath string, v interface{}) error {
	file, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("readJSONFile: %w", err)
	}
	return json.Unmarshal(file, v)
}

func writeJSONFile(filePath string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("writeJSONFile: %w", err)
	}
	return os.WriteFile(filePath, data, 0644)
}

func submitHandler(w http.ResponseWriter, r *http.Request) {
	var requestBody struct {
		Directory     string              `json:"directory"`
		Types         map[string]string   `json:"types"`
		Tags          map[string][]string `json:"tags"`
		WeatherConfig []string            `json:"weatherConfig"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		http.Error(w, fmt.Sprintf("submitHandler: Error decoding request body: %v", err), http.StatusBadRequest)
		return
	}

	var results []map[string]interface{}
	err = readJSONFile(filepath.Join(dirname, "data", "results.json"), &results)
	if err != nil {
		http.Error(w, fmt.Sprintf("submitHandler: Error reading file: %v", err), http.StatusInternalServerError)
		return
	}

	results = append(results, map[string]interface{}{
		"outfit":        requestBody.Directory,
		"types":         requestBody.Types,
		"tags":          requestBody.Tags,
		"weatherConfig": requestBody.WeatherConfig,
	})

	err = writeJSONFile(filepath.Join(dirname, "data", "results.json"), results)
	if err != nil {
		http.Error(w, fmt.Sprintf("submitHandler: Error writing file: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "JSON file has been saved."}`))
}

func nextOutfitHandler(w http.ResponseWriter, r *http.Request) {
	var directories map[string]bool
	err := readJSONFile(filepath.Join(dirname, "data", "directories.json"), &directories)
	if err != nil {
		http.Error(w, fmt.Sprintf("nextOutfitHandler: Error reading file: %v", err), http.StatusInternalServerError)
		return
	}

	var pending []string
	err = readJSONFile(filepath.Join(dirname, "data", "pending.json"), &pending)
	if err != nil {
		http.Error(w, fmt.Sprintf("nextOutfitHandler: Error reading file: %v", err), http.StatusInternalServerError)
		return
	}

	var nextOutfit string
	var numOfClassified int
	for directory, classified := range directories {
		if !classified && !slices.Contains(pending, directory) {
			nextOutfit = directory
			pending = append(pending, directory)
			break
		}
		if classified {
			numOfClassified++
		}
	}

	err = writeJSONFile(filepath.Join(dirname, "data", "pending.json"), pending)
	if err != nil {
		http.Error(w, fmt.Sprintf("nextOutfitHandler: Error writing file: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Printf("Classified %d out of %d outfits\n", numOfClassified, len(directories))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(nextOutfit)
}

func markDoneHandler(w http.ResponseWriter, r *http.Request) {
	var requestBody struct {
		CurrentOutfit string `json:"currentOutfit"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		http.Error(w, fmt.Sprintf("markDoneHandler: Error decoding request body: %v", err), http.StatusBadRequest)
		return
	}

	var directories map[string]bool
	err = readJSONFile(filepath.Join(dirname, "data", "directories.json"), &directories)
	if err != nil {
		http.Error(w, fmt.Sprintf("markDoneHandler: Error reading file: %v", err), http.StatusInternalServerError)
		return
	}

	directories[requestBody.CurrentOutfit] = true

	err = writeJSONFile(filepath.Join(dirname, "data", "directories.json"), directories)
	if err != nil {
		http.Error(w, fmt.Sprintf("markDoneHandler: Error writing file: %v", err), http.StatusInternalServerError)
		return
	}

	var pending []string
	err = readJSONFile(filepath.Join(dirname, "data", "pending.json"), &pending)
	if err != nil {
		http.Error(w, fmt.Sprintf("markDoneHandler: Error reading pending.json file: %v", err), http.StatusInternalServerError)
		return
	}

	var newPending []string
	for _, outfit := range pending {
		if outfit != requestBody.CurrentOutfit {
			newPending = append(newPending, outfit)
		}
	}

	err = writeJSONFile(filepath.Join(dirname, "data", "pending.json"), newPending)
	if err != nil {
		http.Error(w, fmt.Sprintf("markDoneHandler: Error writing pending.json file: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "JSON file has been saved."}`))
}

func imagesHandler(w http.ResponseWriter, r *http.Request) {
	request := strings.Split(r.URL.Path, "/")[2:]
	directory := request[0]
	directoryPath := filepath.Join(dirname, "..", "images", directory)
	var image string
	if len(request) >= 2 {
		image = request[1]
	}

	if image != "" {
		http.ServeFile(w, r, filepath.Join(directoryPath, image))
		return
	}

	files, err := os.ReadDir(directoryPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("imagesHandler: Unable to scan directory: %v", err), http.StatusInternalServerError)
		return
	}

	var images []string
	for _, file := range files {
		if !file.IsDir() && (filepath.Ext(file.Name()) == ".jpg" || filepath.Ext(file.Name()) == ".png") {
			images = append(images, file.Name())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(images)
}

func staticHandler(w http.ResponseWriter, r *http.Request) {
	filename := strings.Split(r.URL.Path, "/")[len(strings.Split(r.URL.Path, "/"))-1]
	ext := strings.Split(filename, ".")[1]

	switch ext {
	case "css":
		w.Header().Set("Content-Type", "text/css")
	case "js":
		w.Header().Set("Content-Type", "application/javascript")
	}

	http.ServeFile(w, r, "./static/"+filename)
}
