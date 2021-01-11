# Whis-key : Telegram Bot for Whiskey

In this project, we will create a telegram bot in order to handle multiple user interaction with a wiskey database.

## Deploying
This bot uses both Neo4j and MongoDB for data persistance. Both can be started using docker-compose : ```docker-compose up```. The bot is under the alias ```Whis-key```


## Available Commands

* ```/help``` : List all the commands below and describe this project.
* ```/Top10HighestPercentage``` : List the whiskeys with the highest percentage of alcohol.
* ```/taste``` : Shows the user's taste grouped by nose, body, palate and finish.
* ```/liked``` : List all whiskeys liked by the current user.
* ```/recommendwhiskies``` : List whiskeys recommended depending on the user's likes
