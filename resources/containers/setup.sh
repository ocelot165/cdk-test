#!/bin/bash
echo "https://oauth2:$GITHUB_TOKEN@github.com/$GITHUB_URL"
git clone "https://oauth2:$GITHUB_TOKEN@github.com/$GITHUB_URL" ponderInstance 
cd ponderInstance
touch .env.local
envsubst < ../exampleenv.txt > .env.local
npm i
npm run $PONDER_INSTANCE_COMMAND