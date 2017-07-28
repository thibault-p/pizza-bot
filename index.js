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

const sizes = ['tartine', 'petite', 'medium'];


let channel;
let self;

let orders = {};

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



	const args = req.body.text.toLowerCase().split(' ');
	let content;
	let error;
	let user = {
		id: req.body.user_id,
		name: req.body.user_name
	};
	console.log(user);
	if (args.indexOf('help') !== -1) {
		content = help();
	} else if (args.indexOf('list') !== -1) {
		content = list();
	} else if (args.indexOf('summary') !== -1) {
		content = summary();
	} else if (args.indexOf('order') !== -1) {
		content = add(args, user);
	} else if (args.indexOf('cancel') !== -1) {
		content = cancel(user);
	}

	if (!content) {
		content = help('Je n\'ai pas crompris votre demande.');
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

function help(err) {
	const options = [
		'*Général*',
		'\t_list_: Liste les pizzas disponibles',
		'\t_summary_: Affiche l\'ensemble de la commande',
		'*Commander*',
		'\t_order_: Ajoute une commande. `order [tartine|petite|medium] [pizza_name]`',
		'\t_cancel_: Annule une commande',
		'\t_commit_: Valide la commande groupée'
	];
	const attachments = [
		{
			title: '*Usage* : /pizza (options)',
			text: options.join('\n'),
			mrkdwn_in: ['title', 'text']
		}
	];
	if (err) {
		attachments.unshift({
			color: 'danger',
			text: `Erreur : ${err}`,
			mrkdwn_in: ['title', 'text']
		});
	}
	return {
	    response_type: 'ephemeral',
		attachments: attachments,
		mrkdwn: true
	};
}


function summary() {
	let sum = 0;
	const content = [];

	for (k in orders) {
		if (!orders.hasOwnProperty(k)) {
			continue;
		}
		const o = orders[k];
		console.log(o);
		sum += o.order.price;
		content.push({
			title: o.user.name,
			text: `${o.order.name} (_${o.order.size}_): ${o.order.price}€`,
			"mrkdwn_in": ["text"]
		});
	}
	let text = 'Je n\'ai pas encore reçu de commande. :pensive:';
	const l = Object.keys(orders).length;
	if (l > 0) {
		const s = (l > 1)? 's': '';
		text = `J'ai enregistré ${l} commande${s}, total: ${sum}€`;
	}
	return {
	    response_type: 'ephemeral',
	    text: `Résumé de la commande groupée :\n\t${text}`,
		attachments: content,
		mrkdwn: true
	};
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

function add(args, user) {
	let o = orders[user.id];
	if (o) {
		return {
		    response_type: 'ephemeral',
		    text: `Vous avez déjà une commande: ${o.order.type} (${o.order.size}) ${o.order.price}€.`
		};
	}
	let size;
	for (let s = 0; s < sizes.length; ++s) {
		if (args.indexOf(sizes[s]) !== -1)
		{
			console.log(s);
			size = s;
			break;
		}
	}
	if (size === undefined) {
		return {
			response_type: 'ephemeral',
			text: `Vous devez spécifier la taille de la pizza. :wink:`
		};
	}
	let type;
	for (let e = 0; e < menu.length; ++e) {
		if (args.indexOf(menu[e].name.toLowerCase()) !== 1)
		{
			type = menu[e];
			break;
		}
	}
	if (!type) {
		return {
			response_type: 'ephemeral',
			text: `Vous devez spécifier le nom de la pizza. :wink:`
		};
	}
	console.log(type);
	orders[user.id] = {
		user: user,
		order: {
			name: type.name,
			price: type.price[size],
			size: sizes[size]
		}
	};
	console.log(orders[user.id]);
	return {
		response_type: 'ephemeral',
		text: `C'est noté ! :slightly_smiling_face:`
	};
}

function cancel(user) {
	let o = orders[user.id];
	if (!o) {
		return {
		    response_type: 'ephemeral',
		    text: `Vous \'avez pas de commande à annuler. :wink:`
		};
	}
	orders[user.id] = undefined;
	delete orders[user.id];
	return {
		response_type: 'ephemeral',
		text: `Votre commande a bien été annulée. :confounded:`
	};
}
