'use strict';

const SlackService = {
    generateMenu: function(menu) {
        const content = menu.map((e) => {
    		const price = e.price.map((p) => { return `${p}€`; }).join(', ');
            // (code)   name : (prices) description
    		return `(*${e.code}*) *${e.name}* : (${price}) _${e.description}_`;
    	});
    	return {
    	    response_type: 'ephemeral',
    		title: 'Menu',
    	    text: content.join('\n'),
    		mrkdwn_in: ['text']
    	};
    },

    generateSummary: function(orders) {
        let sum = 0;
        const content = [];
        console.log(orders);
        for (let k in orders) {
            if (!orders.hasOwnProperty(k)) {
                continue;
            }
            const o = orders[k];
            sum += o.order.price;
            content.push({
                title: o.user.name,
                text: `${o.order.name} (_${o.order.size}_): ${o.order.price}€`,
                "mrkdwn_in": ["text"]
            });
        }
        let text = 'Je n\'ai pas encore reçu de commande. :pensive:';
        const l = content.length;
        if (l > 0) {
            const s = (l > 1)? 's': '';
            text = `J'ai enregistré ${l} commande${s}. Total: ${sum}€`;
        }
        return {
            response_type: 'ephemeral',
            text: `Résumé de la commande groupée :\n\t${text}`,
            attachments: content,
            mrkdwn: true
        };
    },

    generateHelp: function(sizes, message) {
        const options = [
            '*Général*',
            '\t_list_ : Lister les pizzas disponibles',
            '\t_summary_ : Afficher l\'ensemble de la commande',
            '*Commander*',
            '\t_order_ : Ajouter une commande. `order [' +  sizes.join('|') +'] [pizza_code]`',
            '\t_cancel_ : Annuler une commande',
            '\t_commit_ : Valider la commande groupée'
        ];
        const attachments = [
            {
                title: 'Usage : /pizza (options)',
                text: options.join('\n'),
                mrkdwn_in: ['title', 'text']
            }
        ];
        if (message) {
            attachments.unshift({
                color: 'danger',
                text: `Erreur : ${message}`,
                mrkdwn_in: ['title', 'text']
            });
        }
        return {
            response_type: 'ephemeral',
            attachments: attachments,
            mrkdwn: true
        };
    },

    generateCloseMessage: function(from, until) {
        return {
            content: {
                response_type: 'ephemeral',
                text: `:no_good: C'est fermé !\n_Les commandes sont ouvertes du ${from.format("dddd HH:mm")} au ${until.format("dddd HH:mm")}._`
            }
        };
    },

    generateNotReady: function() {
        return {
            content: {
                response_type: 'ephemeral',
                text: `Je suis à vous dans quelques secondes. :sweat_smile: `
            }
        };
    },

    generateAlreadyOrder: function(type, name, size, price) {
        return {
            response_type: 'ephemeral',
            text: `Vous avez déjà une commande: ${type} - _${name}_ (${size}) ${price}€.`
        };
    },

    generateOrderSizeNotFound: function() {
        return {
            response_type: 'ephemeral',
            text: `Vous devez spécifier la taille de la pizza. :wink:`
        };
    },

    generateOrderTypeNotFound: function() {
        return {
            response_type: 'ephemeral',
            text: `Vous devez spécifier le code de la pizza. :wink:`
        };
    },

    generateOrderSaved: function() {
        return {
            response_type: 'ephemeral',
            text: `C'est noté ! :slightly_smiling_face:`
        };
    },

    generateNoOrderToDelete: function() {
        return {
            response_type: 'ephemeral',
            text: `Vous \'avez pas de commande à annuler. :wink:`
        };
    },

    generateOrderDeleted: function() {
        return {
    		response_type: 'ephemeral',
    		text: `Votre commande a bien été annulée. :confounded:`
    	};
    },

    generateNoOrderToCommit: function() {
        return {
            response_type: 'ephemeral',
            text: `Pas de commande à envoyer.`
        };
    },

    generateCommitOrder: function() {
        return {
            response_type: 'ephemeral',
            text: `Votre commande a bien été validée. :ok_hand:`
        };
    }
};

module.exports = SlackService;
