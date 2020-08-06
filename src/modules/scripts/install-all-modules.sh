#!/bin/bash

echo
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "~ All Modules installer ver 1.0   ~"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo

checkDependencies(){

	PKG_OK=$(dpkg-query -W --showformat='${Status}\n' jq|grep "install ok installed")
	#echo Checking for somelib: $PKG_OK
	if [ "" == "$PKG_OK" ]; then
		echo "Package jq is missing. Please run 'sudo apt install jq' and run again"
		exit
	fi
}

updateCurrentTag(){
	echo
	echo updateCurrentTag
	echo
	currModule=$1
	fetchedVer=$2
	
	#cd $modulesFolder
	echo "modulesFolder: $modulesFolder"
	regVersion=$(cat "$modulesFolder/../../server/model-config.json" |jq '._meta.modules| .[]| select(.name=="'$currModule'")|.currentVersion ')
	#regVersion=${regVersion/\"\'/c}

	regVersion="${regVersion#\'}"
	regVersion="${regVersion%\'}"
	regVersion="${regVersion%\"}"
	regVersion="${regVersion#\"}"
	

	echo "regVersion without quotes: $regVersion"
	echo "Current version ($regVersion)" 
	echo "fetched version ($fetchedVer)"

	if [ "$regVersion" == "$fetchedVer" ]; then
		echo "Current version ($regVersion) equals to fetched version ($fetchedVer), nothing to do"
		return
	fi

	echo "Versions differ, updating currentVersion entry.."
	
	#newEntry='"fetchVersion": "v1.0.0"'
	#smallFetchedVer=$(echo $fetchedVer | sed 's/v//g')
	#newEntry=$(cat "$modulesFolder/../../server/model-config.json" |jq '._meta.modules| .[]| select(.name=="'$currModule'")|.currentVersion="test" ' | tr '\n' ' ')
	newEntry=$(cat "$modulesFolder/../../server/model-config.json" |jq '._meta.modules| .[]| select(.name=="'$currModule'")|.currentVersion="'$fetchedVer'" ')
	# add , between }{ ??
	newEntry=$(echo $newEntry |sed 's/"/DOUBLE_QUOTES/g; s/ /WHITE_SPACE/g')
	#echo $newEntry
	modulesEntry=$(jq '._meta.modules| .[]| select(.name=="'$currModule'")="BEGIN_STATEMENT'$newEntry'END_STATEMENT" ' ../../server/model-config.json)
	modulesEntry=$(echo $modulesEntry |sed 's/"/DOUBLE_QUOTES/g; s/ /WHITE_SPACE/g')
	#modulesEntry=$(cat "$modulesFolder/../../server/model-config.json" \
	#|jq '._meta.modules| .[]| select(.name=="'$currModule'")="'$newEntry'" ' \
	#|tr '\n' ' ')
	#echo $modulesEntry
	#modulesEntry=$(echo modulesEntry |sed 's/"/DOUBLE_QUOTES/g')
	#modulesEntry=$(echo modulesEntry |sed 's/ /WHITE_SPACE/g')
	#cat ../../server/model-config.json | jq "._meta.modules[._meta.modules|length] |= . + $moduleEntry" > /tmp/model-config.json
	#modulesEntry="{}"
	jq '._meta.modules=["BEGIN_STATEMENT'$modulesEntry'END_STATEMENT"]' ../../server/model-config.json >/tmp/model-config.json
	#cat /tmp/model-config.json
	#exit
	sed 's/DOUBLE_QUOTES/"/g; s/WHITE_SPACE/ /g; s/"BEGIN_STATEMENT//g; s/END_STATEMENT"//g; s/} {/},{/g' /tmp/model-config.json > /tmp/model-config2.json
	#sed 's/} {/},{/g' /tmp/model-config2.json >/tmp/model-config3.json
	#cat /tmp/model-config2.json
	if [ -s /tmp/model-config2.json ]; then
		echo "Updating model-config.json..."
		jq . /tmp/model-config2.json > $modulesFolder/../../server/model-config.json
	else
		echo "Cannot write into model-config.json, check your code and try again.."
	fi
	
	#sed 's/WHITE_SPACE/"/g' /tmp/model-config.json
	#cat ../../server/model-config.json | jq "._meta.modules" 

	#echo $modelsConfig

	#cat "$modulesFolder/../../server/model-config.json" | jq "._meta.modules[._meta.modules|length] |= . + $modulesEntry"
	#cat  "$modulesFolder/../../server/model-config.json" | jq '._meta.modules[._meta.modules|length] |= . + "'$modulesEntry'"'
	echo
	echo

}

#checkDependencies

NOCOLOR='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

if [ -d "$modulesFolder/samples" ] && [ -d "$modulesFolder/scripts" ]; then
	source scripts/update-samples-json.sh
fi	

#Iterate through all models in model-config
#Does it exit? great, update it.
#If doesn't exist, clone it
readarray -t modulesList < <(cat ../../server/model-config.json | jq -r '._meta.modules|.[]|.name')
readarray -t modulesPath < <(cat ../../server/model-config.json | jq -r '._meta.modules|.[]|.path')
readarray -t modulesGit < <(cat ../../server/model-config.json | jq -r '._meta.modules|.[]|.github')
readarray -t versions < <(cat ../../server/model-config.json | jq -r '._meta.modules|.[]|.fetchVersion')


#echo "Versions:"
#printf '%s\n' "${versions[@]}"



currDir=$(dirname ${BASH_SOURCE[0]})

#echo "currDir? $currDir"

for module in "${!modulesList[@]}"
do
   
   echo -ne Checking ${YELLOW}${modulesList[$module]}${NOCOLOR} installation...
   
   #echo "Module:${modulesList[$module]}"    
   #modPath="server/${modulesPath[$module]}"
   modPath=$(basename ${modulesPath[$module]})
   #echo "modPath:$modPath"

   if [ ! -d "$modPath" ]; then
   	echo -e "${GREEN}Installing${NOCOLOR}"
   	echo
	#mFolder=$(basename ${modulesPath[$module]})
	#echo "Cloning $newModule into $mFolder.."
	#echo "CURRENT PWD? $(pwd)"
	fetchVer=${versions[$module]}
	#echo "fetchVer:($fetchVer)"

	#lastTag="${tagsList[-1]}"
	#echo "lastTag:$lastTag"

	if [ "$fetchVer" == "latest" ]; then
		
		echo "git clone ${modulesGit[$module]} $modPath"
		echo -ne "Cloning to the ${GREEN}latest${NOCOLOR} version (lastest commit)..."
		
		git clone ${modulesGit[$module]} $modPath >/dev/null 2>/dev/null
		retVal=$?
		if [ $retVal -ne 0 ]; then
			echo "git clone error. Try to clone this module manually"
			echo
			continue
		fi
		
		readarray -t tagsList < <(cd $modPath && git tag)
		#echo "--tags list--"
		#printf '%s\n' "${tagsList[@]}"
		
		if [ ${#tagsList[@]} -eq 0 ]; then
			#echo "tag is empty"
			lastTag=
			echo -e "${GREEN}success${NOCOLOR} (latest)"
		else
			#echo "tag is NOT empty"
			lastTag="${tagsList[-1]}" 
			echo -e "${GREEN}success${NOCOLOR} ($lastTag) (latest)"
		fi
	
	else
		
		echo "git clone ${modulesGit[$module]} $modPath"
		echo -en "${GREEN}Trying to checkout a specific tag ($fetchVer)${NOCOLOR}..."
		
		git clone ${modulesGit[$module]} $modPath >/dev/null 2>/dev/null
		retVal=$?
		if [ $retVal -ne 0 ]; then
			echo "git clone error. Try to clone this module manually"
			echo
			continue
		fi

		#echo -e "${GREEN}OK${NOCOLOR}"
		#echo "Module has been successfully installed, on model-config.json switch enabled to 'true' to enable on your project"
		#updateCurrentTag ${modulesList[$module]} $fetchVer
	

		
		readarray -t tagsList < <(cd $modPath && git tag)
		#echo "--Available versions--"
		#printf '%s\n' "${tagsList[@]}"
		if [[ ! " ${tagsList[@]} " =~ " ${fetchVer} " ]]; then
			echo "The requested version ($fetchVer) doesn't exist inside this module, staying with the latest version"			
		else
			cd $modPath
			#git --git-dir=$modPath/.git checkout tags/$fetchVer -b $fetchVer 2>/dev/null >/dev/null
			git checkout tags/$fetchVer -b $fetchVer 2>/dev/null >/dev/null
			cd ..
			retVal=$?
			if [ $retVal -ne 0 ]; then
				echo "Could not switch to the requested version ($fetchVer), check your module github tags and try again..."
				echo
				continue
			else
				echo -e "${GREEN}success${NOCOLOR} ($fetchVer)"				
				updateCurrentTag ${modulesList[$module]} $fetchVer
			fi
		fi
		
	fi

	echo
	else
		echo -e "${GREEN}Already installed${NOCOLOR}"
	fi
done

echo
#moduleEntry=$(cat ../../server/model-config.json |jq '._meta.modules')
#echo "moduleEntry: $moduleEntry"
