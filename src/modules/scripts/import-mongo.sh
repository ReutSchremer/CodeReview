#!/bin/bash
NC='\033[0m'
RED='\e[31m'
set -e

if [ $# == 0 ]; then
    echo -e "\e[33mUsage:${NC} import-mongo <db-name> [merge]"
    echo "* <db-name>: as in your database. "
    echo "* [merge]: optional- the incoming db will not drop your existing data in case of conflict."
    
fi

if [ -z "$1" ]; then
    echo -e "\\n${RED}Please specify database name to import.\\n"
    exit
fi

if [ ! -z "$2" ] && [ "$2" != "merge" ]; then
    echo -e "${RED}No matching args, did you mean to use merge?\\n${NC}"
    exit
fi

mkdir -p /tmp/dumps/$1/
echo -e "\e[93mCopying files..${NC}"

scp carmeldev:/home/carmel/dumps/$1/* /tmp/dumps/$1/

if [ "$2" == "merge" ]; then
    echo
    echo -e "\e[93mWe are merging existing database with the incoming data.${NC}"
    mongorestore --db $1 /tmp/dumps/$1/
else
    echo
    mongorestore --drop --db $1 /tmp/dumps/$1/
fi
echo

echo -e "\e[1m\e[38;5;42mSUCCESS!"
echo
