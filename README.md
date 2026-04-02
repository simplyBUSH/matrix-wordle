
# Matrix-wordle

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
![Matrix](https://img.shields.io/badge/Matrix-bot-blueviolet)
![Unofficial NYT](https://img.shields.io/badge/NYT_Wordle-unofficial-red)

This is a wordle bot for the internet messaging platform Matrix. It creates a wordle session for a user, saves the results in a database and can display a leaderboard. It works across spaces and rooms.

## Latest update drop
### Added support for custom themes!!
- After a successful trial run on our focus group, our team came to the conclusion that custom themes are something our users are craving. You can choose from a variety of pre-made themes to display after winning a game, or you can make your own! To get more info, send ```!theme h``` to our bot
- The keyboard colors have also been changed to actually display correctly the progress of your guess
- A few iOS-specific bugs have also been fixed


## Test

You can test it yourself right now! Create a room **```without E2EE```** and invite `@wordle:simplybush.pl` to it, it will accept automatically. It does, however, take a few seconds to respond because of federation. Then, run ```!help``` to view available commands

## How it works
When my friends and I switched to Matrix, we really missed the Wordle app that was built into Discord. Matrix widgets exist, but they’re dependent on which client you use. My workaround was to create a bot not unlike the old wordle bots before the collab: when you type !play, it generates a game ID linked to your user profile and waits for a "game over" signal from that specific URL. Ideally, the link would be sent as a message only the player can see, but that functionality doesn't exist in Matrix. I had two options: send the link in plain text for everyone in that room to see, or as a DM. I chose the first one, mostly because this is just a small project for me and my friends and we're honest enough to not solve each other's games. If you have a better way of doing this, let me know.

## Deployment

To deploy this project 

1. make sure to edit your .env and Traefik routes (examples in repo)

2. run

```bash
  docker compose up --build
```
3. move the words.txt file to the data dir created by the bot

## Roadmap

- active game caching for possible mid game server restart

- global leaderboard maybe?

- Enabling end-to-end-encryption (probably for last since not easy)

## Acknowledgements

- [matrix-bot-sdk](https://github.com/turt2live/matrix-bot-sdk) — Matrix bot framework
- [word-list](https://github.com/tabatkins/wordle-list) - List with correct words

> **Note:** Puzzle data is fetched from the unofficial NYT Wordle endpoint.
> Not affiliated with or endorsed by The New York Times.
