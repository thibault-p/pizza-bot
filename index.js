const express = require('express');
const bodyParser = require('body-parser')
const Bot = require('./bot');
const app = express();
const ovh = require('ovh');

const checkDate = (typeof process.env.CHECK_DATE === 'undefined')? false : process.env.CHECK_DATE;
const slash_token = process.env.SLACK_SLASH_TOKEN || 'test';

const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const openDay = 2; // mardi
const startTime = new Date(0, 0, 0, 9, 0, 0);
const endTime = new Date(0, 0, 0, 11, 15, 0);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



// register callback for SMS if needed


const bot = new Bot();

const menu = [
	{ name: 'Reine', code: 'A1', description: 'jambon, mozza, champignon, olives, pesto, tomates', price: [5, 6, 8]},
	{ name: 'Larzac', code: 'A2', description: '', price: [5, 6, 8]},
	{ name: 'Forté', code: 'A3', description: '', price: [5, 6, 8]},
	{ name: 'Calzone', code: 'A4', description: '', price: [5, 6, 8]},
	{ name: 'Thon', code: 'A5', description: '', price: [5, 6, 8]},
	{ name: 'Quatre-fromages', code: 'A6', description: '', price: [5, 6, 8]},
	{ name: 'Végétarienne', code: 'A7', description: '', price: [5, 6, 8]}
];

const sizes = ['tartine', 'petite', 'medium'];


let channel;
let self;

let orders = {};


function compareTime(d1, d2) {
	let d = d1.getHours() - d2.getHours();
	if (d !== 0) return d;
	d = d1.getMinutes() - d2.getMinutes();
	if (d !== 0) return d;
	return d1.getSeconds() - d2.getSeconds();
}

function pad(num, size) {
    var s = '00' + num;
    return s.substr(s.length-size);
}
function timeToString(d) {
	return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`;
}

app.post('/pizza/smsResponse', function(req, res) {
	if (req.body.moMessage) {
		bot.sendMessage('Je viens de recevoir une réponse par SMS à propos de la commande :\n>>>' + req.body.moMessage);
	}
	res.status(200);
	res.send();
});



app.post('/pizza', function (req, res) {
	if (req.body.token !== slash_token)
	{
		res.status(403);
		res.send({ error: 'token not valid' });
		return;
	}

	if (checkDate) {
		console.log('Checking date');
		const now = new Date(Date.now());
		let open = now.getDay() !== openDay;
		open = open && compareTime(startTime, now) <= 0;
		open = open && compareTime(endTime, now) >= 0;
		if (!open) {
			res.send({
				response_type: 'ephemeral',
				text: `:no_good: C'est fermé !\n_Les commandes sont ouvertes le ${days[openDay]} de ${timeToString(startTime)} à ${timeToString(endTime)}._`
			});
			return;
		}
	}

	const args = req.body.text.toLowerCase().split(' ');
	let content;
	let error;
	let user = {
		id: req.body.user_id,
		name: req.body.user_name
	};
	console.log(user);
	console.log(args);
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
	} else if (args.indexOf('commit') !== -1) {
		content = commit(user);
	}

	if (!content) {
		error = 'Je n\'ai pas crompris votre demande.';
	}

	if (error) {
		content = help(error);
	}
	res.send(content);
});


app.listen(process.env.PORT || 5000);

function help(err) {
	const options = [
		'*Général*',
		'\t_list_ : Liste les pizzas disponibles',
		'\t_summary_ : Affiche l\'ensemble de la commande',
		'*Commander*',
		'\t_order_ : Ajoute une commande. `order [tartine|petite|medium] [pizza_code]`',
		'\t_cancel_ : Annule une commande',
		'\t_commit_ : Valide la commande groupée'
	];
	const attachments = [
		{
			title: 'Usage : /pizza (options)',
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
		return `(*${e.code}*)*${e.name}*: (${price}) _${e.description}_`;
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
		if (args.indexOf(menu[e].code.toLowerCase()) !== -1)
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
	orders[user.id] = {
		user: user,
		order: {
			name: type.name,
			price: type.price[size],
			size: sizes[size]
		}
	};
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


function generateSMS() {
	const list = {};
	for (let k in orders) {
		if (!orders.hasOwnProperty(k)) {
			continue;
		}
		const o = orders[k];
		const hash = `${o.order.code}-${o.order.size}`;
		if (!list[hash]) {
			list[hash] = {
				number: 0, name: o.order.name, size: o.order.size
			};
		}
		list[hash].number++;
	}
	const content = [];
	for (let k in list) {
		if (!list.hasOwnProperty(k)) {
			continue;
		}
		const o = list[k];
		content.push(`${o.number} ${o.size} ${o.name}`);
	}
	return `Bonjour, je souhaite commander pour 12h30 au nom de SIRADEL :\n${content.join('\n')}\nMerci.`
}

function commit(user) {
	if (Object.keys(orders) === 0) {
		return {
			response_type: 'ephemeral',
			text: `Pas de commande à envoyer.`
		};
	}
	sms = generateSMS();
	bot.sendMessage(`La commande a été validée par ${user.name}. Je confirme la commande par SMS:\n>>>` + sms);
	return {
		response_type: 'ephemeral',
		text: `Votre commande a bien été validée. :ok_hand:`
	};
}
