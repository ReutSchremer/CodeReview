#!/bin/bash

for row in $(cat modules-list.json| jq -r '.[]'); do
	echo "~~~row~~~"
	echo $row
done	
