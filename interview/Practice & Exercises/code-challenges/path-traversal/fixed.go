package main

import (
	"net/http"
	"path/filepath"
	"strings"
)

func download(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("file")
	if strings.Contains(name, "..") || filepath.IsAbs(name) {
		http.Error(w, "invalid", http.StatusBadRequest)
		return
	}
	base := filepath.Clean("/var/data")
	path := filepath.Join(base, filepath.Clean(name))
	if !strings.HasPrefix(path, base+string(filepath.Separator)) {
		http.Error(w, "invalid", http.StatusBadRequest)
		return
	}
	http.ServeFile(w, r, path)
}
