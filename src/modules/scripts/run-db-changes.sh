#!/bin/bash


checkDependencies(){
	PKG_OK=$(dpkg-query -W --showformat='${Status}\n' jq|grep "install ok installed")
	#echo Checking for somelib: $PKG_OK
	if [ "" == "$PKG_OK" ]; then
		echo "Package jq is missing. Please run 'sudo apt install jq' and run again"
		exit
	fi
}


DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DUMPS_DIR=$DIR/../../../dumps

#Read mysql variables from the project datasources.json
#TODO - read the correct file on staging/production
DATASOURCES_FILE=$DIR/../../../server/datasources.json
DB=$(cat $DATASOURCES_FILE | jq -r '.msql.database')
HOST=$(cat $DATASOURCES_FILE | jq -r '.msql.host')
USER=$(cat $DATASOURCES_FILE | jq -r '.msql.user')
PW=$(cat $DATASOURCES_FILE | jq -r '.msql.password')

if [ $HOST != 'localhost' ]; then
	echo -n "Warning, connecting to DB on $HOST. Are you sure? [Y/n] "
     	read confirm
     	if [ $confirm != "Y" ] && [ $confirm != "y" ]; then
        	echo Ok..so chao!
          	exit
     	fi
fi

if ! [ -f $DUMPS_DIR/$DB.dump.sql ]; then
	echo "$DB.dump.sql file missing."
	echo Aborting... 
        exit
fi

if ! [ -f $DUMPS_DIR/db_changes.wc ]; then
	echo -n "Cannot find the file db_changes.wc. If you continue, your database will be overwritten. Continue? [Yes/n] "
     	read confirm
     	if [ -z $confirm ] ; then
		echo "If you want to continue, write Yes"
          	exit
	fi
	if [ $confirm != "Yes" ] ; then
		echo Ok..so chao!
          	exit	
	fi
	touch $DUMPS_DIR/db_changes.wc
	start=0
fi

if ! [ -f $DUMPS_DIR/$DB.changes.sql ];then
	touch $DUMPS_DIR/$DB.changes.sql
fi

if ! [ -s $DUMPS_DIR/db_changes.wc ];then
	#The file is empty -> Overwrite the exiting DB with a clean dump
	echo -n "You are about to DELETE the existing $DB database at $HOST. ARE YOU SURE? [Y/n] "
     	read confirm
     	if [ $confirm == "Y" ] || [ $confirm == "y" ]; then
          	echo -n "Overriding database"
	  	echo 
		#create the DB if it doesn't exist.
		IGNORE_ERROR=$(mysql -h$HOST -u$USER -p$PW -e "DROP DATABASE IF EXISTS $DB " 2>&1 > /dev/null)	
		IGNORE_ERROR=$(mysql -h$HOST -u$USER -p$PW -e "CREATE DATABASE $DB CHARACTER SET utf8" 2>&1 > /dev/null)
		#now run the dump 		
		MYSQL_ERR=$(mysql -h$HOST -u$USER -p$PW $DB < $DUMPS_DIR/$DB.dump.sql 2>&1 > /dev/null)
		if [[ $MYSQL_ERR =~ "ERROR" ]] ;then
			echo $MYSQL_ERR
			echo "aborting..."	
			exit
		fi
     	else
          	echo Ok..so chao!====
          	exit
     	fi	
else 
	#The file is not empty. All you need to do is run the commands in the changes file
	read -r start<$DUMPS_DIR/db_changes.wc
	re='^[0-9]+([.][0-9]+)?$'
	if ! [[ $start =~ $re ]]; then
   		echo "error: value in file db_changes.wc is not a number"
 		exit
	fi					
	echo -n "Run latest changes to the $DB database on $HOST? [Y/n] "
     	read confirm
     	if [ $confirm != "Y" ] && [ $confirm != "y" ]; then
          	echo Ok..so chao!
          	exit
     	fi
fi	
#In any case, need to run the changes from the point where it was last run (or from the begining...)
echo "run $DB.changes.sql starting from row $start"
	
#Trim new lines and white spaces from the end of $DB.changes.sql
sed '/^ *$/d' $DUMPS_DIR/$DB.changes.sql > /tmp/$DB.changes.sql.new
mv /tmp/$DB.changes.sql.new $DUMPS_DIR/$DB.changes.sql	

#run the SQL 	
SQL=$(tail -n +$start $DUMPS_DIR/$DB.changes.sql)	
MYSQL_ERR=$(mysql -h$HOST -u$USER -p$PW $DB -e "$SQL" 2>&1 > /dev/null)
if [[ $MYSQL_ERR =~ "ERROR" ]] ;then
	echo $MYSQL_ERR
	echo "Automtic process failed. You might need to manually set the correct value in db_changes.wc"
	echo "aborting..."	
	exit
fi
	
#update the line number to start from last time
num_lines=$(wc -l < $DUMPS_DIR/$DB.changes.sql)
new_start=$((num_lines+1))
echo $new_start> $DUMPS_DIR/db_changes.wc
echo "next start will be from row $new_start"

echo "Done"
