#!/bin/bash
aws s3 cp s3://githubrepobucket/ ./ponderInstance --recursive --exclude '*' --include "$STACK_NAME-repo/*"
cd ponderInstance
cd $STACK_NAME-repo
touch .env.local
envsubst < ../../exampleenv.txt > .env.local
npm i
npm run $PONDER_INSTANCE_COMMAND