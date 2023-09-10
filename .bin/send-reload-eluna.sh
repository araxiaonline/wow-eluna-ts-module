#!/usr/bin/expect

set CONTAINER_PATTERN "worldserver"
# set MATCHING_CONTAINER [exec docker ps --format '{{.Names}}' | grep "$CONTAINER_PATTERN" | head -n 1]
set MATCHING_CONTAINER [string trim [exec docker ps --format '{{.Names}}' --filter "name=$CONTAINER_PATTERN" | head -n 1] "'"]

puts "Matching container found: $MATCHING_CONTAINER" ;# Debugging output

# Start the 'expect' script to interact with the container's running script.
spawn docker attach "$MATCHING_CONTAINER"

# Wait for the expected prompt or any other specific output that indicates the script is ready for input.
expect "AC>"

# Send the '.saveall' command to the container's script.
send ".reload eluna\r"

send ".reload config\r"

# Wait for a moment (if needed) to ensure the command is processed.

# Send the 'Ctrl+P' key combination.
send "\x10"

# Send the 'Ctrl+Q' key combination.
send "\x11"

# Finish the interaction.
expect eof

