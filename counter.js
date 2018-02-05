'use strict';

const moment = require('moment-timezone');
moment.locale('fr');

const SlackService = require('./slackservice');
const BotService = require('./botservice');
const SmsService = require('./smsservice');
const RedisService = require('./redisservice');

// Config file listing available pizza :)
const menuRaw = require('./menu.json');

const COUNTER_DEFAULT_CUSTOMER = process.env.DEFAULT_CUSTOMER || 'SIRADEL';
const COUNTER_DEFAULT_TIME = process.env.DEFAULT_PICKUP_TIME || '12h30';


const COUNTER_ORDER_KEY = 'PIZZA_BOT_ORDER';
const COUNTER_REMINDER_SECONDS = 60 * 10; // 5 minutes

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
        this._ready = false;
        this._timeout = -1;
        this._redisService = new RedisService(COUNTER_ORDER_KEY);
        const self = this;
        this._redisService.load((err, data) => {
            if (err) {
                console.error('Failed to retrieve previous order');
            }
            self._orders = data || {};
            self._addOrRemoveReminder();
            self._ready = true;
        });
        this.initializeMenu();
    }
    get opening() {
        return this.open;
    }

    get closing() {
        return this.close;
    }

    get menu() {
        return this._menu;
    }

    get size() {
        return this._sizes;
    }

    get phone() {
        return this._phone;
    }

    set customer(name) {
        this._orders.counterCustomerName = name;
    }

    get customer() {
        return this._orders.counterCustomerName || COUNTER_DEFAULT_CUSTOMER;
    }

    set pickupTime(time) {
        this._orders.counterPickupTime = time;
    }

    get pickupTime() {
        return this._orders.counterPickupTime || COUNTER_DEFAULT_TIME;
    }

    get expirationTime() {
        const nowRaw = moment();
        const now = nowRaw.clone().tz('Europe/Paris');
        const close = now.clone();
        close.hour(this.closing.hour());
        close.minute(this.closing.minute());
        close.second(0);
        const ttl = moment.duration(close.diff(now)).asSeconds();
        console.log('Computed ttl:', ttl);
        return ttl;
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
        console.log('Counter opening:', this.opening.format('dddd HH:mm'));
        console.log('Counter closing:', this.closing.format('dddd HH:mm'));
        console.log('Available sizes:', this._sizes);
    }

    _addOrRemoveReminder() {
        const nbOrders = this._generateOrderSummary().length;
        if (nbOrders === 0) {
            // no more reminder needed
            if (this._timeout === -1) {
                clearTimeout(this._timeout);
                this._timeout = -1;
            }
            return;
        }
        const reminder = this.expirationTime - COUNTER_REMINDER_SECONDS;
        if (reminder > 0) {
            console.log('Create a reminder occuring in ' + reminder + 's');
            this._timeout = setTimeout(() => {
                this._botService.sendMessage('On va bientôt fermer, il va falloir penser à confirmer votre commande... :thinking_face:');
            }, reminder);
        }
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
    		return { content: SlackService.generateAlreadyOrder(order.order.type, order.order.name, order.order.size, order.order.price) };
    	}
    	let sizeIdx;
    	for (let s = 0; s < this._sizes.length; ++s) {
    		if (args.indexOf(this._sizes[s]) !== -1)
    		{
    			sizeIdx = s;
    			break;
    		}
    	}
    	if (sizeIdx === undefined) {
            return { content: SlackService.generateOrderSizeNotFound() };
    	}
    	let type;
    	for (let e = 0; e < this._menu.length; ++e) {
    		if (args.indexOf(this._menu[e].code.toLowerCase()) !== -1)
    		{
    			type = this._menu[e];
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
    			size: this._sizes[sizeIdx],
    			type: type.code
    		}
    	};
        this._redisService.save(this._orders, this.expirationTime);
    	this._botService.sendMessage('Une commande vient d\'être ajoutée. Quelqu\'un d\'autre ? :smirk:');
        this._addOrRemoveReminder();
        return { content: SlackService.generateOrderSaved() };
    }

    _deleteOrder(user) {
        const order = this._orders[user.id];
    	if (!order) {
    		return { content: SlackService.generateNoOrderToDelete() };
    	}
    	this._orders[user.id] = undefined;
    	delete this._orders[user.id];
        this._redisService.save(this._orders, this.expirationTime);
    	this._botService.sendMessage('Une commande vient d\'être retirée. :(');
        this._addOrRemoveReminder();
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
        this._addOrRemoveReminder();
        this._redisService.save(this._orders, this.expirationTime);
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
        if (!this._ready) {
            return SlackService.generateNotReady();
        }
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
