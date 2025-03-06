package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

var dirname = os.Getenv("DIRNAME")
var directoryPath = filepath.Join(dirname, "..", "images")

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/index.html")
	})

	data := http.FileServer(http.Dir("data"))
	http.Handle("/data/", http.StripPrefix("/data/", data))

	http.HandleFunc("/submit", submitHandler)
	http.HandleFunc("/next-outfit", nextOutfitHandler)
	http.HandleFunc("/mark-done", markDoneHandler)
	http.HandleFunc("/images/", imagesHandler)
	http.HandleFunc("/static/", staticHandler)

	fmt.Println("Server is running on port 8080")
	http.ListenAndServe(":8080", nil)
}
