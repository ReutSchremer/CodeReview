#!/bin/bash
NC='\033[0m'
BOLD='\e[1m'
ITALIC='\e[3m'
set -e
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo " ~    Help manuel ver 1.0    ~"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo

pwd=$(pwd)
modulesFolder=$pwd/src/modules

if [ ! -d "$modulesFolder" ]; then
	echo
	echo "Could not find $modulesFolder"
	echo "make sure you run this script from your project root path"
	echo "and you do have modules installed and then try again"
	echo
	exit
else
	cd $modulesFolder
fi

if [ ! -d "$modulesFolder/scripts" ]; then
	echo
	echo "Could not find $modulesFolder/scripts"
	echo "Make sure you clone this module (cd src/modules && git clone https://github.com/carmel-6000/scripts scripts) and try again"
	echo
	exit
fi

jq -c '.[]' scripts/commands-list.json | while read i; do
	moduleName=$(echo $i | jq '."name"') ##| sed -e 's/^"//' -e 's/"$//'
	if [ "$moduleName" != "null" ]; then
		moduleEntry=$(cat $pwd/package.json | jq '.scripts.'$moduleName' ')
		echo -e "${BOLD}\e[38;5;42m$(echo $moduleName | sed -e 's/^"//' -e 's/"$//' | tr a-z A-Z) ${NC}"

		runC=$(echo $i | jq '."run"')
		if [ "$runC" == "null" ]; then
			runC=$(echo "npm run $moduleName")
		fi
		runC=$(sed -e 's/"//' -e 's/"$//' <<<$runC) # here we delete ALL occurrences of quotes.

		params=$(echo $i | jq '."params"')
		if [ "$params" != "null" ]; then
			params=$(sed -e 's/^"//' -e 's/"$//' <<<$params)
			echo -e "Run:\e[32m ${runC} $params ${NC}"
		else
			echo -e "Run:\e[32m ${runC} ${NC}"
		fi

		brief=$(echo $i | jq '."brief"')

		if [ "$brief" != "null" ]; then
			brief=$(sed -e 's/^"//' -e 's/"$//' <<<$brief)
			echo -e "${ITALIC}${brief}${NC}"
		fi
		echo -e "\\n~~~~~~~~~~~~~~~~~~~~~~~~~~~"

		if [ $moduleEntry == null ]; then

			# echo -n "Adding module into package.json..."
			scriptSrc=$(echo $i | jq '."src"')
			if [ $scriptSrc != null ]; then
				cat $pwd/package.json | jq ".scripts += {$moduleName:$scriptSrc}" >/tmp/package.json
				if [ ! -s /tmp/package.json ]; then
					echo "Could not add a new entry to package.json"
					echo "please do it manually or fix script or package.json syntax on pumba"
				else
					cp /tmp/package.json $pwd/package.json

				fi
			fi
		fi
		echo
	fi
done
