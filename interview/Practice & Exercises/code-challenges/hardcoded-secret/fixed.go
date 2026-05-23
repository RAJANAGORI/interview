package main

import "os"

func apiKey() string {
    return os.Getenv("API_KEY") // load from env/secret manager at runtime
}

func main() {}
