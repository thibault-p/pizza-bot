const express = require('express');
const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const _ = require('lodash');
const bot_token = process.env.SLACK_BOT_TOKEN || '';
const rtm = new RtmClient(bot_token);
const app = express();
const CHANNELTOUSE = process.env.SLACK_BOT_CHANNEL || 'general'

let channel;
let self;

let order = {};

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
	self = rtmStartData.self;
	for (const c of rtmStartData.channels) {
    if (c.name === CHANNELTOUSE) {
		channel = c.id
	}
  }
});

// you need to wait for the client to fully connect before you can send messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
	console.log('I\'m ready: ', channel);
});

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
	console.log('Message:', message); //this is no doubt the lamest possible message handler, but you get the idea
	handleMessage(message);
});

rtm.start();

app.post('/pizza', function (req, res) {
  	console.log(req);
	res.send('This is your pizza');
});

app.listen(process.env.PORT || 5000);


function handleMessage(msg) {
	if (!msg.user) {
		return;
	}
	if (!_.includes(msg.text.match(/<@([A-Z0-9])+>/igm), `<@${self.id}>`))
	{
		return;
	}
	rtm.sendMessage('Merci de penser à moi', msg.channel);
}
