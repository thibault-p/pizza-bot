'use strict';

const moment = require('moment-timezone');
moment.locale('fr');

const SlackService = require('./slackservice');
const BotService = require('./botservice');
const SmsService = require('./smsservice');

// Config file listing available pizza :)
const menuRaw = require('./menu.json');

const COUNTER_DEFAULT_CUSTOMER = process.env.DEFAULT_CUSTOMER || 'SIRADEL';
const COUNTER_DEFAULT_TIME = process.env.DEFAULT_PICKUP_TIME || '12h30';

class Counter {
    constructor(open, close, phone) {
        this._botService = new BotService();
        this._smsService = new SmsService();
        this.open = open;
        this.close = close;
        this._phone = phone;
        this._customer = undefined;
        this._pickupTime = undefined;
        this._menu = [];
        this._sizes = [];
        this._orders = {};
        this.initializeMenu();
        // TODO retrieve orders from redis
    }
    get opening() {
        return this.open.format('dddd HH:mm');
    }

    get closing() {
        return this.close.format('dddd HH:mm');
    }

    get phone() {
        return this._phone;
    }

    set customer(name) {
        this._customer = name;
    }

    get customer() {
        return this._customer || COUNTER_DEFAULT_CUSTOMER;
    }

    set pickupTime(time) {
        this._pickupTime = time;
    }

    get pickupTime() {
        return this._pickupTime || COUNTER_DEFAULT_TIME;
    }

    initializeMenu() {
        console.log('Initializing menu...');
        const self = this;
        menuRaw.categories.forEach((c) => {
        	c.list.forEach((e, i) => {
        		e.code = c.name + (i + 1)
        		self._menu.push(e);
        	});
        });
        console.log('Found', this._menu.length, 'entries');
        this._sizes = menuRaw.sizes;
    }

    isOpen() {
        console.log('Check if open...');
        const nowRaw = moment();
        const now = nowRaw.clone().tz('Europe/Paris');
        console.log('Time in Paris:', now.format());
        return now.isBetween(this.open, this.close);
    }

    showInfo() {
        console.log('Phone number:', this.phone);
        console.log('Counter opening:', this.opening);
        console.log('Counter closing:', this.closing);
        console.log('Available sizes:', this._sizes);
        console.log('Menu', this._menu);
    }

    _generateOrderSummary() {
        const list = {};
    	for (let k in this._orders) {
    		if (!this._orders.hasOwnProperty(k)) {
    			continue;
    		}
    		const o = this._orders[k];
    		const hash = `${o.order.type}-${o.order.size}`;
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
        return content;
    }

    _addOrder(user, args) {
        const order = this._orders[user.id];
    	if (order) {
    		return { content: SlackService.generateAlreadyOrder(order.order.type, order.order.size, order.order.price) };
    	}
    	let sizeIdx;
    	for (let s = 0; s < sizes.length; ++s) {
    		if (args.indexOf(sizes[s]) !== -1)
    		{
    			sizeIdx = s;
    			break;
    		}
    	}
    	if (size === undefined) {
            return { content: SlackService.generateOrderSizeNotFound() };
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
            return { content: SlackService.generateOrderTypeNotFound() };
    	}
        // add order
    	this._orders[user.id] = {
    		user: user,
    		order: {
    			name: type.name,
    			price: type.price[sizeIdx],
    			size: sizes[sizeIdx],
    			type: type.code
    		}
    	};
        // TODO save to redis
    	bot.sendMessage('Une commande vient d\'être ajoutée. Quelqu\'un d\'autre ? :smirk:');
        return { content: SlackService.generateOrderSaved() };
    }

    _deleteOrder(user) {
        const order = this._orders[user.id];
    	if (!order) {
    		return { content: SlackService.generateNoOrderToDelete() };
    	}
    	this._orders[user.id] = undefined;
    	delete this._orders[user.id];
    	bot.sendMessage('Une commande vient d\'être retirée. :(');
    	return { content: SlackService.generateOrderDeleted() };
    }

    _commitOrder(user) {
        if (Object.keys(this._orders).length === 0) {
            return { content: SlackService.generateNoOrderToCommit() };
        }
        const sms = this._smsService.generateSMS(this._generateOrderSummary());
        const self = this;
        this._smsService.sendSms(pizzaCounter.phone, sms, function(err) {
            if (err) {
                self._botService.sendMessage('Oups oups oups, je n\'ai pas réussi à envoyer le SMS. :sweat:');
                return;
            }
            self._botService.sendMessage(`La commande a été validée par ${user.name}. Je confirme la commande par SMS:\n>>>${sms}`);
            self._resetOrder();
        });
        return { content: SlackService.generateCommitOrder() };
    }

    _resetOrder() {
        console.log('Delete orders');
        this._orders = {};
        // TODO save to redis
    }

    _getOrder() {
        return { content: SlackService.generateSummary(this._orders) };
    }

    _help(message) {
        return { content: SlackService.generateHelp(this._sizes, message) };
    }

    _list() {
        return { content: SlackService.generateMenu(this._menu) };
    }

    parseCommand(user, args) {
        let response = {};
        if (!this.isOpen()) {
            return SlackService.generateCloseMessage(this.opening, this.closing);
        }
        if (args.indexOf('help') !== -1) {
    		response = this._help();
    	} else if (args.indexOf('list') !== -1) {
    		response = this._list();
    	} else if (args.indexOf('summary') !== -1) {
    		response = this._getOrder();
    	} else if (args.indexOf('order') !== -1) {
    		response = this._addOrder(user, args);
    	} else if (args.indexOf('cancel') !== -1) {
    		response = this._deleteOrder(user);
    	} else if (args.indexOf('commit') !== -1) {
    		response = this._commitOrder(user);
    	} else {
            response = { error: true, content: 'Commande non reconnue' };
        }
        if (response.error) {
            response = this._help(response.content);
        }
        return response.content;
    }
};

module.exports = Counter;
