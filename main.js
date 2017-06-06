var redisPort = process.env.redis_PORT;
var mutex = require('node-mutex')({
    port: redisPort
});
module.exports = {
    Context: function (parameters, key) {
        'use strict';
        var self = this;
        if (parameters[key]) {
            self._key = key;
            self._value = parameters[key];
            delete parameters[key];
            self.get = function (key) {
                return self._value[key];
            };
            self.inject = function (target, key) {
                if (key) {
                    target[key] = self._value;
                } else {
                    target[self._key] = self._value;
                }
            };
            self.available = true;
            self.wrap = {
                // TODO: Attach code identifier to code
                before: function (target, original, before, codeIdentifier) {
                    function wrapped() {
                        before.apply(target, arguments);
                        return original.apply(target, arguments);
                    }

                    return wrapped;
                },
                // TODO: Attach code identifier to code
                delay: function (target, original, codeIdentifier) {
                    function wrapped() {
                        var parameters = arguments;
                        setTimeout(function () {
                            return original.apply(target, parameters);
                        }, self._value.delay);
                    }

                    return wrapped;
                },
                mutex: function (target, original, codeIdentifier) {
                    function wrapped() {
                        var value = self._value;
                        if (codeIdentifier != value.codeIdentifier) {
                            console.log('nodejs-flow-limit.mutex skipping by code identifier');
                            original.apply(target, arguments);
                            return;
                        }
                        // This may be useful but for now don't plan to enable that
                        // if (!value.codeIdentifier || !value.requestIdentifier) {
                        //     console.log('nodejs-flow-limit no data to build mutex name');
                        //     original.apply(target, arguments);
                        //     return;
                        // }
                        var mutexName = value.codeIdentifier + ':' + value.requestIdentifier;
                        console.log('nodejs-flow-limit.mutex trying to acquire lock: ' + mutexName);
                        mutex.lock(mutexName, function (error, unlock) {
                            if (error) {
                                console.error('nodejs-flow-limit.mutex unable to acquire lock: ', error);
                                return;
                            }

                            original.apply(target, arguments);
                            unlock();
                        });

                    }

                    return wrapped;
                }
            };
        } else {
            self.available = false;
        }
    }
};