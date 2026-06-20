#!/bin/sh
set -e
npm run db:migrate:deploy
npm run db:seed:production
exec npm start
