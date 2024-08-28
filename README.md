# Ponder.sh SaaS backend Infra(WIP)

This repo contains the cdk stack and resources necessary to create and delete ponder services.

Each users ponder service corresponds to one cloudformation stack, with the following ID: userName-githubUrl-versionSlug

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
