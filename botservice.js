'use strict';

const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;


class BotService {
	constructor() {
		this._initialize();
		this._ready = false;
		this._rtm = undefined;
		this._botToken = process.env.SLACK_BOT_TOKEN;
		this._channel = process.env.SLACK_BOT_CHANNEL || 'general';
	}

	_initialize() {

		if (!this._botToken) {
			console.error('Unable to initialize bot service');
			return;
		}
		this._rtm = new RtmClient(this._botToken);

		const self = this;
		this._rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
			for (const c of rtmStartData.channels) {
				if (c.name === self._channel) {
					self._channelId = c.id
					console.log('Using channel:', self._channelId);
				}
			}
		});
		// you need to wait for the client to fully connect before you can send messages
		this._rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
			console.log('I\'m ready');
			self._ready = true;
		});
		this._rtm.start();
	}

	sendMessage(message) {
		if (this._ready){
			this._rtm.sendMessage(message, this._channelId);
		}
	};

}
module.exports = BotService;
