#!/bin/bash
aws s3 cp s3://githubrepobucket/ ./ponderInstance --recursive --exclude '*' --include "$STACK_NAME-repo/*"
# unzip -d ponderInstance ponderInstance.zip
# git clone "https://oauth2:$GITHUB_TOKEN@github.com/$GITHUB_URL" ponderInstance 
cd ponderInstance
ls
cd $STACK_NAME-repo
touch .env.local
envsubst < ../../exampleenv.txt > .env.local
npm i
npm run $PONDER_INSTANCE_COMMAND