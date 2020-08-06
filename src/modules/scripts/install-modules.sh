#!/bin/bash

echo
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "~ Modules installed ver 1.0   ~"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo


checkDependencies(){

	PKG_OK=$(dpkg-query -W --showformat='${Status}\n' jq|grep "install ok installed")
	#echo Checking for somelib: $PKG_OK
	if [ "" == "$PKG_OK" ]; then
		echo "Package jq is missing. Please run 'sudo apt install jq' and run again"
		exit
	fi
}

checkDependencies

NOCOLOR='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
pwd=$(pwd)
modulesFolder=$pwd/src/modules

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

if [ ! -d "$modulesFolder/scripts" ];then
	echo
	echo "Could not find $modulesFolder/scripts" 
	echo "Make sure you clone this module (cd src/modules && git clone https://github.com/carmel-6000/scripts scripts) and try again"
	echo
        exit
fi

echo -n "Updating module scripts..."
cd scripts
git pull origin master >/dev/null 2>/dev/null
cd ..
echo -e "${GREEN}OK${NOCOLOR}"

cat scripts/modules-list.json
readarray -t modulesList < <(cat scripts/modules-list.json | jq -r '.[] | .name')
echo
echo "List of available modules for installation"
echo
printf '%s\n' "${modulesList[@]}"
echo
read -p "Type module name to install :" newModule
if [[ ! " ${modulesList[@]} " =~ " ${newModule} " ]]; then
	echo "Sorry, I couldn't recognize this module in the list, try again..."
	exit
fi

moduleEntry=$(cat ../../server/model-config.json |jq '._meta.modules| .[]| select(.name=="'$newModule'") ')
#echo "moduleEntry: $moduleEntry"
if [ ! -z "$moduleEntry" ];then
	echo "Module ($newModule) is already listed on model-config.json"
else
	echo -n "Adding module into model-config.json..."
	moduleEntry=$(cat scripts/modules-list.json |jq '.[]| select(.name=="'$newModule'") ' | tr '\n' ' ')
	#echo "moduleEntry:$moduleEntry"
	cat ../../server/model-config.json | jq "._meta.modules[._meta.modules|length] |= . + $moduleEntry" > /tmp/model-config.json
	if [ ! -s /tmp/model-config.json ];then
		echo "Could not add a new entry to model-config.json"
		echo "please do it manually or fix script or model-config.json syntax on pumba"
	else
		cp /tmp/model-config.json ../../server/model-config.json
	fi
	#cat ../../server/model-config.json | jq "._meta.modules[._meta.modules|length] |= . + $moduleEntry" 
	echo -e "${GREEN}OK${NOCOLOR}"
fi


mGithub=$(cat scripts/modules-list.json | jq -r '.[] | select(.name=="'$newModule'") | .github')
mPath=$(cat scripts/modules-list.json | jq -r '.[] | select(.name=="'$newModule'") | .path')
mFolder=$(basename $mPath)

#echo "mGithub: $mGithub"
#echo "mPath: $mPath"
#echo "mFolder: $mFolder"

if [ ! -d "$mFolder" ]; then

	echo "Installing module $newModule..."

	#echo "Cloning $newModule into $mFolder.."
	git clone $mGithub $mFolder
			
	retVal=$?
	if [ $retVal -ne 0 ]; then
		echo "git clone error. Try to close this module manually"
	else
		echo -e "${GREEN}OK${NOCOLOR}"
		echo "Module has been successfully installed, on model-config.json switch enabled to 'true' to enable on your project"
	fi
else
	echo "Module ($newModule) is already installed on folder $modulesFolder/$newModule"
fi

if [ -d "$modulesFolder/samples"] && [ -d "$modulesFolder/scripts"]; then
	source scripts/update-samples-json.sh
fi	