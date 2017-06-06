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
                        var parameters = arguments;
                        var value = self._value;
                        if (codeIdentifier != value.codeIdentifier) {
                            console.log('nodejs-flow-limit.mutex skipping by code identifier');
                            original.apply(target, arguments);
                            return;
                        }
                        var mutexName = value.codeIdentifier + ':' + value.requestIdentifier;
                        console.log('nodejs-flow-limit.mutex trying to acquire lock: ' + mutexName);
                        mutex
                            .lock(mutexName, 3000)
                            .then(function (unlock) {
                                console.log('nodejs-flow-limit.mutex calling original implementation');
                                original.apply(target, parameters);
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