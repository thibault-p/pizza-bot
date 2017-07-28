'use strict';

const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const _ = require('lodash');
const botToken = process.env.SLACK_BOT_TOKEN;
const channelToUse = process.env.SLACK_BOT_CHANNEL || 'general'


function Bot()
{
	if (!botToken) return;
	this.rtm = new RtmClient(botToken);

	let self = this;
	this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
		for (const c of rtmStartData.channels) {
	    if (c.name === channelToUse) {
			self.channel = c.id
		}
	  }
	});

	// you need to wait for the client to fully connect before you can send messages
	this.rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
		console.log('I\'m ready');
	});

	console.log('Starting bot');
	this.rtm.start();
}

Bot.prototype.sendMessage = function (msg) {
	if (this.rtm){
		this.rtm.sendMessage('Merci de penser à moi', this.msg.channel);
	}
};

module.exports = Bot;
