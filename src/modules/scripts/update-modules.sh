#!/bin/bash

echo
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "~ Modules auto update ver 1.0 ~"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo

pwd=$(pwd)

modulesFolder=$pwd/src/modules

NOCOLOR='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'


updateModule(){

	st=$1
	module="${st/\//}"
	echo	
	echo -n "Updating module '$module'..."
        cd $module
	#pwd
	hasDiffs=$(git status -s | cut -c4-)
	if [ ! -z "$hasDiffs" ];then
		echo "There are diffs, please checkout or commit repository and then try again"
		sleep 1
	else
		git pull origin master >/dev/null 2>/dev/null
	        retVal=$?
		if [ $retVal -ne 0 ]; then
			echo "git error. Try to update this module manually."
		        sleep 1
		else
			echo -e "${GREEN}OK${NOCOLOR}"
		fi	
	fi	
	cd ..	
}

if [ ! -d "$modulesFolder" ];then
	echo
	echo "Could not find $modulesFolder" 
	echo "make sure you run this script from your project root path"
	echo "and you do have modules installed and then try again"
	echo
        exit
else
	cd $modulesFolder
fi	


echo "Updating existing modules..."
for moduleDir in */; do
	#echo $moduleDir
	updateModule $moduleDir
done

if [ -d "$modulesFolder/samples"] && [ -d "$modulesFolder/scripts"]; then
	source scripts/update-samples-json.sh
fi	


echo Done
