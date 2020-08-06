#!/bin/bash
set -e

if [ -z "$1" ]; then
	echo "Please specify database name to import."
	exit
fi

if [ $(mongo localhost:27017 --eval "db.getMongo().getDBNames().indexOf('$1')" --quiet) -lt 0 ]; then
    echo -e "\e[31mDatabase $1 does not exist in your local mongo"
    exit
fi

mongodump --db $1 --out /tmp/dumps/
echo -e "\e[93mUploading to carmeldev..."
echo
rsync -r /tmp/dumps/$1/* carmeldev:/home/carmel/dumps/$1/

echo -e "\e[1m\e[38;5;42mSUCCESS!"
echo