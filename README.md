# Whis-key : Telegram Bot for Whiskey

In this project, we will create a telegram bot in order to handle multiple user interaction with a wiskey database.

## Deploying
This bot uses both Neo4j and MongoDB for data persistence. Both can be started using docker-compose : ```docker-compose up```. 

To be able to run this project, you need to create a `.env` based on the `.env.example`

We can add data in our container with the command ``npm run ts-import``. 
``npm run ts-start`` allows you to run the server.

The bot is under the alias ```Whis-key```

## Botfather

Our application use inline query, we need to enable this in botfather. 
With `/setinline` enable this and add a placeholder message and `/setinlinefeedback` to enable to retrieve the feedback

We can add the available command with `/setcommands`.

## Available Commands

* ```/help``` : List all the commands below and describe this project.
* ```/Top10HighestPercentage``` : List the whiskeys with the highest percentage of alcohol.
* ```/taste``` : Shows the user's taste grouped by nose, body, palate and finish.
* ```/liked``` : List all whiskeys liked by the current user.
* ```/recommendwhiskies``` : List whiskeys recommended depending on the user's likes
* ```/top10Liked``` : List the top 10 (or less) whiskeys liked by all users
