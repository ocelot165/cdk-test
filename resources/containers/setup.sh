#!/bin/bash
echo "https://oauth2:$GITHUB_TOKEN@github.com/$GITHUB_URL"
git clone "https://oauth2:$GITHUB_TOKEN@github.com/$GITHUB_URL" ponderInstance 
cd ponderInstance
touch .env.local
envsubst < ../exampleenv.txt > .env.local
# echo $DATABASE_URL
# echo PONDER_RPC_URL_$CHAIN_ID=$RPC_URL >> .env.local
# echo DATABASE_URL=$DATABASE_URL >> .env.local
npm i
cat .env.local
npm run $PONDER_INSTANCE_COMMAND