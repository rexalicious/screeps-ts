module.exports = {
    getset: function (key, cacheTicks, fnGet, fnEncode, fnDecode) {
        if (!Memory.cache) Memory.cache = {};
        if (!fnEncode) fnEncode = function(o) { return o; }
        if (!fnDecode) fnDecode = function(o) { return o; }
        
        let cached = Memory.cache[key];
        if (cached && cached.expires > Game.time) {
            //console.log('Using cached value for', key);
            return fnDecode(cached.value);
        } else {
            let value = fnGet();
            if (value) {
                Memory.cache[key] = { expires: Game.time + cacheTicks, value: fnEncode(value) };
                return value;
            }
        }
    },
    
    get: function(key) {
        if (!Memory.cache) Memory.cache = {};
        
        if (cached && cached.expires > Game.time) {
            return cached.value;
        } else {
            return undefined;
        }
    },
    
    delete: function(key) {
        if (!Memory.cache) Memory.cache = {};
        
        if (key in Memory.cache) {
            delete Memory.cache[key];
        }
    },
    
    cleanup: function () {
        for (var key in Memory.cache) {
            if (key.expires > Game.time) {
                delete Game.cache[key];
            }
        }
    }
};