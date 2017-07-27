const express = require('express');
const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const bot_token = process.env.SLACK_BOT_TOKEN || '';
const rtm = new RtmClient(bot_token);
const app = express();

let channel;

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
	console.log('Bot connected');
	console.log(rtmStartData.channels);
	for (const c of rtmStartData.channels) {
	console.log(c.name);
    if (c.name === 'test-bot') {
		channel = c.id
	}
  }

});

// you need to wait for the client to fully connect before you can send messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
	console.log('send message to: ', channel);
	rtm.sendMessage("Hello!", channel);
});

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  console.log('Message:', message); //this is no doubt the lamest possible message handler, but you get the idea
});

rtm.start();

app.get('/', function (req, res) {
  res.send('Hi.')
});

app.listen(process.env.PORT || 5000);
