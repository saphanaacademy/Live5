#!/bin/bash
# This script calls XSUAA rest endpoints /sap/rest/samltrust/add
# to create trust and /sap/rest/samltrust/test to check 
# if XS_APPLICATIONUSER can be set
# (c) 2017 SAP SE
#### uncomment the defaults here if you do not need an extra configuration setting file
#MDC_DATABASE=
#HANA_SID=XSA
#HANA_INSTANCE=00
#HANA_SYSTEM_USER=SYSTEM
#HANA_SYSTEM_PASSWORD=
#XSA_USER=XSA_ADMIN
#HANA_XSPATH=/usr/sap/hana/shared/XSA/xs
#XSA_UAA_ENDPOINT="https://`hostname -f`:30032/uaa-security"
#JDBC_HANA_ENDPOINT="jdbc:sap://`hostname -f`:30015"
#JDBC_HANA_ENDPOINT="jdbc:sap://`hostname -f`:30013"
echo "Print out XS_APPLICATIONUSER: Starting."
echo ""
if [ "$#" -ge 1 ]; then
  echo "Configuration:" $1
  source $1
else
  echo "Parameter Warning. You SHOULD specify the configuration, e.g. \"$0 xsuaa_settings.cfg\"."
fi
echo ""
if [ $? != 0 ]; then
  echo "Test UAA Trust to HANA. Use defaults."
  if [ -n "$SAPSYSTEMNAME" ]; then
     HANA_SID=$SAPSYSTEMNAME
  fi
  if [ -n "$TINSTANCE" ]; then
     HANA_INSTANCE=$TINSTANCE
  fi
  if [ -n "$XSPATH" ]; then
     HANA_XSPATH=$XSPATH
  fi
else
  echo "XS_APPLICATIONUSER: external configuration loaded successfully."
fi
if [ -z "$HANA_SID" ]; then
  if [ -n "$SAPSYSTEMNAME" ]; then
     HANA_SID=$SAPSYSTEMNAME
  else
     HANA_SID=XSA
  fi
fi
if [ -z "$HANA_INSTANCE" ]; then
  if [ -n "$TINSTANCE" ]; then
     HANA_INSTANCE=$TINSTANCE
  else
     HANA_INSTANCE=00
  fi
fi
if [ -z "$HANA_XSPATH" ]; then
  if [ -n "$XSPATH" ]; then
     HANA_XSPATH=$XSPATH
  else
     HANA_XSPATH=/usr/sap/hana/shared/$HANA_SID/xs
  fi
fi
if [ -z "$XSA_UAA_ENDPOINT" ]; then
  XSA_UAA_ENDPOINT="https://`hostname -f`:3${HANA_INSTANCE}32/uaa-security"
fi
IS_SINGLE_DB=NO
if [ -z "$JDBC_HANA_ENDPOINT" ]; then
  if [ -n "$MDC_DATABASE" ]; then
     if [ "$MDC_DATABASE" == "SYSTEMDB" ]; then
        JDBC_HANA_ENDPOINT="jdbc:sap://`hostname -f`:3${HANA_INSTANCE}13"
     else
        JDBC_HANA_ENDPOINT="jdbc:sap://`hostname -f`:3${HANA_INSTANCE}13/?databaseName=${MDC_DATABASE}"
     fi
  else
     JDBC_HANA_ENDPOINT="jdbc:sap://`hostname -f`:3${HANA_INSTANCE}15"
     IS_SINGLE_DB=YES
  fi
fi
if [ -z "$HANA_SYSTEM_USER" ]; then
  HANA_SYSTEM_USER="SYSTEM"
fi
if [ -z "$XSA_USER" ]; then
  XSA_USER="XSA_ADMIN"
fi
if [ -z "$HANA_SYSTEM_PASSWORD" ]; then
  echo "HANA password not set in configuration. Password for user $HANA_SYSTEM_USER in JDBC target $JDBC_HANA_ENDPOINT is needed"
  read -s -p "Enter password for $HANA_SYSTEM_USER: " HANA_SYSTEM_PASSWORD
fi
echo ""
echo "==============================================================================="
echo "HANA is single DB system: $IS_SINGLE_DB"
echo "HANA_SID=$HANA_SID"
echo "HANA_INSTANCE=$HANA_INSTANCE"
echo "HANA_XSPATH=$HANA_XSPATH"
echo "UAA_ENDPOINT=$XSA_UAA_ENDPOINT"
echo "HANA jdbcURL=$JDBC_HANA_ENDPOINT"
echo "HANA USER=$HANA_SYSTEM_USER"
echo "XSA ADMIN=$XSA_USER"
if [ ! -x "$HANA_XSPATH/bin/xs" ]; then
  echo "Need xs command line tool to get oauth token. No xs tool found in $HANA_XSPATH/bin"
  echo ""
  exit 1
fi
echo "==============================================================================="
echo "Create oauth token...."
XS_OAUTH_TOKEN=`$HANA_XSPATH/bin/xs oauth-token |grep bearer`
#XS_OAUTH_TOKEN_PLAIN=`$HANA_XSPATH/bin/xs oauth-token |grep bearer | sed 's/bearer //g'`
if [ "$XS_OAUTH_TOKEN" = "" ]; then
  XS_TARGET="https://`hostname -f`:3${HANA_INSTANCE}30"
  echo "Error, oauth token cannot be retrieved, perform xs login first on $XS_TARGET with user $XSA_USER"
  $HANA_XSPATH/bin/xs login -u $XSA_USER -a $XS_TARGET --skip-ssl-validation
  XS_OAUTH_TOKEN=`$HANA_XSPATH/bin/xs oauth-token |grep bearer`
  if [ "$XS_OAUTH_TOKEN" = "" ]; then
    exit 1
  fi
fi
echo "...retrieved token"
substring="XS_APPLICATIONUSER"
echo "==============================================================================="
echo "Create Trust via REST call $XSA_UAA_ENDPOINT/sap/rest/samltrust/add"
response=$(curl --silent --write-out '%{http_code}\n' -o /dev/null -k -X POST -H "Accept: application/json" -H "Content-Type: application/json" -H "Authorization: $XS_OAUTH_TOKEN" "$XSA_UAA_ENDPOINT/sap/rest/samltrust/add" -d "{\"user\":\"${HANA_SYSTEM_USER}\",\"password\":\"${HANA_SYSTEM_PASSWORD}\",\"xsaAdmin\":\"${XSA_USER}\",\"jdbcUrl\":\"${JDBC_HANA_ENDPOINT}\"}")
echo ""
if [ "$response" == "200" ]; then
  echo "OK, SAML/JWT trust created" 
else
  echo "Response failed with HTTP errror: $response . Please check uaa.log in your backend installation for the occurred exception"
  exit 1
fi
echo ""
echo "==============================================================================="
echo "Check Trust via REST call $XSA_UAA_ENDPOINT/sap/rest/samltrust/test"
echo ""
response=$(curl --silent -k -X POST -H "Accept: application/json" -H "Content-Type: application/json" -H "Authorization: $XS_OAUTH_TOKEN" "$XSA_UAA_ENDPOINT/sap/rest/samltrust/test" -d "{\"user\":\"${HANA_SYSTEM_USER}\",\"password\":\"${HANA_SYSTEM_PASSWORD}\",\"xsaAdmin\":\"${XSA_USER}\",\"jdbcUrl\":\"${JDBC_HANA_ENDPOINT}\"}")
#
grep -q 'HTTP method is not allowed' <<< "$response" &&  response=$(curl --silent -k -X GET -H "Accept: application/json" -H "Authorization: $XS_OAUTH_TOKEN" "$XSA_UAA_ENDPOINT/sap/rest/samltrust/test") || echo "POST method allowed." 
grep -q 'XS_APPLICATIONUSER' <<< "$response" &&  echo "Return OK, Result: $response" || echo "Response failed with errror: $response" 
echo "==============================================================================="
echo ""

