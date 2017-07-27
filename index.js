var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var bot_token = process.env.SLACK_BOT_TOKEN || '';

var rtm = new RtmClient(bot_token);

let channel;

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
	console.log('Bot connected');
	console.log(rtmStartData.channels);
	for (const c of rtmStartData.channels) {
	console.log(c_name);
    if (c.name === 'general') {
		channel = c.id
	}
  }

});

// you need to wait for the client to fully connect before you can send messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {

	rtm.sendMessage("Hello!", channel);
});

rtm.start();
