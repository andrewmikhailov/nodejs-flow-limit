var mutex = require('node-mutex')();
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
                before: function (target, original, before) {
                    function wrapped() {
                        before.apply(target, arguments);
                        return original.apply(target, arguments);
                    }

                    return wrapped;
                },
                delay: function (target, original) {
                    function wrapped() {
                        var parameters = arguments;
                        setTimeout(function () {
                            return original.apply(target, parameters);
                        }, self._value.delay);
                    }

                    return wrapped;
                },
                mutex: function (target, original) {
                    function wrapped() {

                        // TODO: Generate a key which will be unique for all injected code
                        mutex.lock('key', function (error, unlock) {
                            if (error) {
                                console.error('Unable to acquire lock: ', error);
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