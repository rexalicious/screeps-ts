const cache = {
    cleanup: () => {
        for (const key in Memory.cache) {

            const cached = Memory.cache[key];
            if (cached.expires > Game.time) {
                delete Memory.cache[key];
            }
        }
    },

    delete: (key: string) => {
        if (!Memory.cache) Memory.cache = {};

        if (key in Memory.cache) {
            delete Memory.cache[key];
        }
    },

    get: (key: string) => {
        if (!Memory.cache) Memory.cache = {};

        const cached = Memory.cache[key];
        if (cached && cached.expires > Game.time) {
            return cached.value;
        } else {
            return undefined;
        }
    },

    getset: (key: string, cacheTicks: number,
             fnGet: () => any,
             fnEncode?: (o: any) => any,
             fnDecode?: (o: any) => any) => {

        if (!Memory.cache) Memory.cache = {};
        if (!fnEncode) fnEncode = (o) => o;
        if (!fnDecode) fnDecode = (o) => o;

        const cached = Memory.cache[key];
        if (cached && cached.expires > Game.time) {
            // console.log('Using cached value for', key);
            return fnDecode(cached.value);
        } else {
            const value = fnGet();
            if (value) {
                Memory.cache[key] = { expires: Game.time + cacheTicks, value: fnEncode(value) };
                return value;
            }
        }
    }
};

export = cache;
