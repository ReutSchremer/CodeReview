#!/bin/bash

source deployment.config.sh

cd $remoteFolder/$projectFolder

es=$?
if [ $es -ne 0 ]; then
	echo "Could not access folder $remoteFolder/$projectFolder, please fix problems and try again"
	exit
fi

echo "git pull origin master"
git pull origin master

es=$?
if [ $es -ne 0 ]; then
	echo "Could not pull origin master, please fix problems and try again"
	exit
fi

if [ ! -z $subProjectFolder ]; then
	cd $subProjectFolder
fi

echo "npm run build"
npm run build

if [ "$?" -ne 0 ]; then
	echo "Could not run build (npm run build), please fix bugs and try again"
	exit
fi

cp build/index.html build/index.html.ejs
cp build/index.html build/index.ejs
find build/ -type f -name "*.map" |xargs rm

read -p "Press enter to restart pm2 project ($pm2Project)"

pm2 restart $pm2Project

if [ "$?" -ne 0 ]; then
	echo "Could not restart pm2 project ($pm2Project), please fix bugs and try again"
	exit
fi

echo 
echo "Project has been successfully deployed!"
echo
