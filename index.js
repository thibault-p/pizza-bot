const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const moment = require('moment');

const Counter = require('./counter');
const SmsService = require('./smsservice');

const slash_token = process.env.SLACK_SLASH_TOKEN || 'test';

// init service to send sms
const smsService = new SmsService(
	process.env.OVH_APP_KEY,
	process.env.OVH_APP_SECRET,
	process.env.OVH_APP_CONSUMER,
	process.env.OVH_SMS_NOTIFY,
	process.env.OVH_SMS_SERVICE);

// init Counter
const _startTime = process.env.STARTTIME;
const _endTime = process.env.ENDTIME;

// Check if opening and closing time are valid
const startTime = moment(_startTime, 'e-HH:mm');
if (!startTime.isValid()){
	console.error('STARTTIME is not valid');
	return;
}
const endTime =  moment(_endTime, 'e-HH:mm');
if (!endTime.isValid()){
	console.error('STARTTIME is not valid');
	return;
}
const pizzaCounter = new Counter(startTime, endTime);
pizzaCounter.showInfo();

// Init web server
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');


 // Routes
app.post('/pizza/smsResponse', function(req, res) {
	bot.sendMessage('Je viens de recevoir une réponse par SMS à propos de la commande :\n>>>' + req.body.message);
	res.status(200);
	res.send();
});


app.post('/pizza', function (req, res) {
	if (!req || !req.body) {
		res.status(403);
		return;
	}

	// check token
	if (req.body.token !== slash_token)
	{
		res.status(403);
		res.send({ error: 'token not valid' });
		return;
	}

	// get command
	if (!req.body.text) {
		res.status(403);
		res.send({ error: 'text is missing' });
		return;
	}
	const args = req.body.text.toLowerCase().split(' ');

	// Get user
	const user = {
		id: req.body.user_id,
		name: req.body.user_name
	};
	if (!user.id || !user.name) {
		res.status(403);
		res.send({ error: 'user not valid' });
		return;
	}

	const content = pizzaCounter.parseCommand(user, args);
	res.send(content);
});


app.get('/', function(req, res) {
	res.render('pages/index', { counter: pizzaCounter });
});


const port = process.env.PORT || 5000;
app.listen(port);
console.log('Starting server on port:', port);
