#!/bin/bash

echo
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "~ Static project deployment scripts  ver 1.0   ~"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo

NOCOLOR='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'

readarray -t sourceFolders < <(ssh carmeldev ls /home/carmel/www/prod)
printf '%s\n' "${sourceFolders[@]}"
read -p "Type source folder from carmeldev to deploy on production server:" sourceFolder

if [[ ! " ${sourceFolders[@]} " =~ " ${sourceFolder} " ]]; then
	echo "Sorry, the folder you typed doesn't exist, try again..."
	exit
fi

readarray -t targetFolders < <(ssh sivan ls /home/carmel/www/prod)
printf '%s\n' "${targetFolders[@]}"
read -p "Type target folder from sivan:" targetFolder

if [[ ! " ${targetFolders[@]} " =~ " ${targetFolder} " ]]; then
	echo "Sorry, the folder you typed doesn't exist, try again..."
	exit
fi

echo "Copying from carmeldev:/home/carmel/www/prod/$sourceFolder to /tmp/kl..."

rm /tmp/kl -rf
mkdir /tmp/kl
rsync -rvza carmeldev:/home/carmel/www/prod/$sourceFolder/* /tmp/kl
cd /tmp/kl
find . -type f -name "*.map" |xargs rm

echo "rsync --dry-run --delete -rvza /tmp/kl/* sivan:/home/carmel/www/prod/$targetFolder"

read -r -p "Are you sure? [y/N] " response
case "$response" in
    [yY][eE][sS]|[yY]) 
        ;;
    *)
        exit
        ;;
esac

echo
rsync  -rvza /tmp/kl/* sivan:/home/carmel/www/prod/$targetFolder
echo

echo
echo -e "${GREEN}Your project has been successfully deployed on production server!${NOCOLOR}"
echo
