#!/bin/bash
echo "Python version:"
python --version
python3 --version

echo "Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Build completed successfully!"
