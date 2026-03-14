
# Matrix-wordle

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
![Matrix](https://img.shields.io/badge/Matrix-bot-blueviolet)
![Unofficial NYT](https://img.shields.io/badge/NYT_Wordle-unofficial-red)

This is a wordle bot for the internet messaging platform Matrix. It creates a wordle session for a user, saves the results in a database and can display a leaderboard. It works across spaces and rooms.


## Test

You can test it yourself right now! Create a room **without E2EE** and invite `@wordle:simplybush.pl` to it. It does take a few seconds to respond because of federation.

## Deployment

To deploy this project run

```bash
  docker compose up --build
```
Just make sure to edit your .env and Traefik routes

## Roadmap

- Timezone handling, not sure what will happen if someone from a different time zone runs this

- Switching to SQLite

- Colored keys on the frontend

- persistent storage for games client side (no refresh cheating)

- active game caching for possible mid game server restart

- caching wordle answer to avoid API timeout

- fixing bad code (calling getAnswer twice, shadowed variables)

- Enabling end-to-end-encryption (probably for last since not easy)

## Acknowledgements

- [matrix-bot-sdk](https://github.com/turt2live/matrix-bot-sdk) — Matrix bot framework

> **Note:** Puzzle data is fetched from the unofficial NYT Wordle endpoint.
> Not affiliated with or endorsed by The New York Times.
