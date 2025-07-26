# Justfile for BTC Premium Calculator
# Run `just` to see available commands

default:
    @just --list

# Run the application in the foreground
run:
    @docker compose up
