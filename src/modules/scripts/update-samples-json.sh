echo
echo  "Creating module's samples json (modules/samples/samples_array_data.json)..."

SCRIPT=`realpath $0`
SCRIPTPATH=`dirname $SCRIPT`
echo $SCRIPTPATH
node samples/scripts/create-samples-json.js >/dev/null 
retVal=$?
if [ "$retVal" -ne 0 ]; then
	echo "Error creating samples json (samples/scripts/create-samples-json.js, please check your code..."
else
	echo -e "${GREEN}OK${NOCOLOR}"
fi
echo