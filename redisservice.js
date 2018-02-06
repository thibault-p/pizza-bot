'use strict';

const redis = require('redis');

class RedisService {
    constructor(key) {
        this._key = key;
        this._client = redis.createClient();
        this._client.on('error', (err) => {
            console.error('Redis error:', err);
        });

    }

    save(data, expiration) {
        const self = this;
        const str = JSON.stringify(data);
        console.log(str);
        expiration = Math.max(0, expiration);
        self._client.set(self._key, str, 'EX', expiration);
    }

    load(callback) {
        this._client.get(this._key, (err, data) => {
            if (err) {
                console.error('Failed to load from redis:', err);
                callback();
                return;
            }
            callback(undefined, JSON.parse(data));
        });
    }
};

module.exports = RedisService;
