package main

import (
	"net/http"
	"path/filepath"
)

func download(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("file")
	// BUG: path traversal via ../
	path := filepath.Join("/var/data", name)
	http.ServeFile(w, r, path)
}
