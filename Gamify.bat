@echo off
cd C:\xampp\htdocs\git\Gamify.io
node main.js -online false -timeout 120000 -threads 1 -debug_mode true -mysql true
pause