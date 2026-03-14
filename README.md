
# Matrix-wordle

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


