#!/bin/bash

currDir="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

echo "current dir:$currDir"

projDeployDir="$currDir/../../../deployment"

echo "projDeployDir=$projDeployDir"

if [ -d "$projDeployDir" ]; then
	echo "$projDeployDir already exist"
	exit
else
	echo "Creating $projDeployDir"
	mkdir $projDeployDir
fi

rsync -rvza $currDir/deployment/. $projDeployDir

