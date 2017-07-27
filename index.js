const express = require('express');
const bodyParser = require('body-parser')
const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const _ = require('lodash');
const bot_token = process.env.SLACK_BOT_TOKEN || '';
const rtm = new RtmClient(bot_token);
const app = express();
const CHANNELTOUSE = process.env.SLACK_BOT_CHANNEL || 'general'
const slash_token = process.env.SLACK_SLASH_TOKEN || 'test';


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const menu = [
	{ name: 'Reine', description: 'jambon, mozza, champignon, olives, pesto, tomates', price: [5, 6, 8]},
	{ name: 'Larzac', description: '', price: [5, 6, 8]},
	{ name: 'Forté', description: '', price: [5, 6, 8]},
	{ name: 'Calzone', description: '', price: [5, 6, 8]},
	{ name: 'Thon', description: '', price: [5, 6, 8]},
	{ name: 'Quatre fromages', description: '', price: [5, 6, 8]},
	{ name: 'Végétarienne', description: '', price: [5, 6, 8]}
];



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

// rtm.start();

app.post('/pizza', function (req, res) {
	if (req.body.token !== slash_token)
	{
		res.status(403);
		res.send({ error: 'token not valid' });
		return;
	}



	const args = req.body.text.split(' ');
	let content;
	let error;
	if (args.indexOf('help') !== -1) {
		content = help();
	} else if (args.indexOf('list') !== -1) {
		content = list();
	} else if (args.indexOf('summary') !== -1) {
		content = summary();
	} else if (args.indexOf('add') !== -1) {
		content = add(args);
	}


	if (error) {
		content = help(error);
	}
	res.send(content);
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

function help() {
	const options = [
		'*Général*',
		'_list_: Liste les pizzas disponibles',
		'_summary_: Affiche l\'ensemble de la commande',
		'*Commander*',
		'_add_: Ajoute une commande. `add [tartine|petite|medium] [pizza_name]`',
		'_rm_: Annule une commande',
		'_commit_: Valide la commande'
	];

	return {
	    response_type: 'ephemeral',
		title: '/pizza (options)',
	    text: options.join('\n'),
		mrkdwn_in: ['text']
	};
}

function summary() {

}

function list() {
	const content = menu.map((e) => {
		const price = e.price.map((p) => { return `${p}€`; }).join(', ');
		return `*${e.name}*: (${price}) _${e.description}_`;
	});


	return {
	    response_type: 'ephemeral',
		title: 'Menu',
	    text: content.join('\n'),
		mrkdwn_in: ['text']
	};
}


function add(args) {

}
