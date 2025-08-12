#!/bin/bash

# Script to open the testing tools page in the default browser

# Define the URL
URL="http://localhost:8080/test-tools.html"

# Check if any argument was passed for test mode
if [ "$1" == "forms" ]; then
    URL="http://localhost:8080/test-tools.html?test=forms"
    echo "Opening Form Validation Test Mode..."
elif [ "$1" == "links" ]; then
    URL="http://localhost:8080/test-tools.html?test=links"
    echo "Opening Link Checker Test Mode..."
else
    echo "Opening Testing Tools Demo..."
fi

# Open the URL in the default browser (macOS)
open "$URL"

echo "Browser opened with URL: $URL"
echo "To stop the server, press Ctrl+C in the terminal window running the server."
