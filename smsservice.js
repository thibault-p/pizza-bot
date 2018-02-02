const Ovh = require('ovh');

const DEFAULT_SMS_CONTENT = 'Bonjour, je souhaite commander pour __TIME__ au nom de __CUSTOMER__ :\n__CONTENT__\nMerci.';


class SmsService {
    constructor(appKey, appSecret, appConsumer, appNotify, service) {
        this._ready = false;
        this._appKey = appKey;
        this._appSecret = appSecret;
        this._appConsumer = appConsumer;
        this._appNotify = appNotify;
        this._service = service;
        this._ovh;
        this._smsContent = process.env.SMS_CONTENT || DEFAULT_SMS_CONTENT;
        this.initialize();
    }

    get ready() {
        return this._ready;
    }

    initialize() {
        if (!this._appKey
            || !this._appSecret
            || !this._appConsumer
            || !this._appNotify
            || !this._service) {
            console.error('Unable to configure sms service: missing parameters');
            return;
        }

        const self = this;
        this._ovh = Ovh({
            endpoint: 'ovh-eu',
            appKey: this._appKey,
            appSecret: this._appSecret,
            consumerKey: this._appConsumer
        },
        function(err, credential) {
            if (err) {
                console.error(err);
                return;
            }
            self._ovh.request('PUT', '/sms/{serviceName}', {
                serviceName: self._service,
                smsResponse: {
                    cgiUrl: self._appNotify,
                    responseType: 'cgi'
                }
            }, function (err2, result) {
                if (err2) {
                    console.error(err2);
                    return;
                }
                console.log('Service ready');
                self._ready = true;
            });
        });
    }

    generateSMS(order, time, customer) {
        return this._smsContent
            .replace('__TIME__', time)
            .replace('__CUSTOMER__', customer)
            .replace('__CONTENT__', content.join('\n'));
    }

    sendSms(number, sms, callback) {
        if (!this.ready) {
            console.error('SmsService not ready');
            callback(new Error('Not ready'));
            return;
        }
        this._ovh.request('POST', '/sms/{serviceName}/jobs', {
        	serviceName: smsService,
        	message: sms,
        	receivers: [this.number],
        	senderForResponse: true
        }, function (err, result) {
        	console.log(err || result);
        	callback(err);
        });
    }
};

module.exports = SmsService;
