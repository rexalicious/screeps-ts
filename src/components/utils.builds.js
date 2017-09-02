
module.exports = (room) => {
    function buildWorkingHarvester(opts) {
        opts = _.defaults(opts || {}, { energy: room.energyCapacityAvailable });

        let  build = { WORK: 1, CARRY: 1, MOVE: 2 }
        let  maxMultiplier = 3;

        let  cost = getBuildCost(build);
        let  multiplier = Math.min(maxMultiplier, Math.floor(opts.energy / cost));

        return buildToArray(multiplyBuild(build, multiplier));
    }

    function buildHarvester(opts) {
        opts = _.defaults(opts || {}, { roads: false, energy: room.energyCapacityAvailable });

        let  build = { CARRY: 2, MOVE: (opts.roads ? 1 : 2) };
        let  maxMultiplier = Math.ceil(Math.min(10, room.energyCapacityAvailable / (8 * CARRY_CAPACITY)));

        let  cost = getBuildCost(build);
        let  multiplier = Math.min(maxMultiplier, Math.floor(opts.energy / cost));

        return buildToArray(multiplyBuild(build, multiplier));
    }

    function buildMiner(opts) {
        opts = _.defaults(opts || {}, { resourceType: RESOURCE_ENERGY, energy: room.energyCapacityAvailable });

        let variable = { WORK: 2, MOVE: 1 };
        let fixed = { CARRY: 1 };

        let maxMultiplier = (opts.resourceType == RESOURCE_ENERGY ? 3 : 10);

        let multiplier = Math.min(maxMultiplier, Math.floor((opts.energy - getBuildCost(fixed)) / getBuildCost(variable)));
        multiplyBuild(variable, multiplier);

        return buildToArray(mergeBuild(variable, fixed));
    }

    function buildHauler(opts) {
        opts = _.defaults(opts || {}, { distance: 10, work: 1, roads: true, harvestRate: 10, energy: room.energyCapacityAvailable } );

        let variable = { CARRY: 2, MOVE: (opts.roads ? 1 : 2) };
        let fixed = { WORK: opts.work, CARRY: (opts.work % 2), MOVE: Math.floor((opts.roads ? 1 : 2) * Math.ceil(opts.work / 2)) };
        let variableCost = getBuildCost(variable);
        let fixedCost = getBuildCost(fixed);
        let energy = opts.energy - fixedCost;


        let carryMultiplier = Math.ceil((2 * opts.distance * opts.harvestRate) / (CARRY_CAPACITY * variable.CARRY));
        let multiplier = Math.max(1, Math.floor(Math.min(energy / variableCost, carryMultiplier)));
        let maxMultiplier = (opts.roads ? 14 : 10);
        multiplier = Math.min(maxMultiplier, multiplier);

        return buildToArray(mergeBuild(fixed, multiplyBuild(variable, multiplier)));
    }

    function buildLinker(opts) {
        opts = _.defaults(opts || {}, { energy: room.energyCapacityAvailable } );
        let variable = { CARRY: 2, MOVE: 1 };
        let maxMultiplier = 4;
        let multiplier = Math.min(maxMultiplier, opts.energy / getBuildCost(variable));
        return buildToArray(multiplyBuild(variable, multiplier));
    }

    function buildBuilder(opts) {
        opts = _.defaults(opts || {}, { energy: room.energyCapacityAvailable });

        let build = { WORK: 1, CARRY: 1, MOVE: 2 };
        let maxMultiplier = 10;
        let multiplier = Math.floor(Math.min(maxMultiplier, opts.energy / getBuildCost(build)));

        return buildToArray(multiplyBuild(build, multiplier));
    }

    function buildUpgrader(opts) {
        opts = _.defaults(opts || {}, { roads: true, energy: room.energyCapacityAvailable });

        let variable = { WORK: 2, MOVE: (opts.roads ? 1 : 2) };
        if (opts.energy < 400) variable = { WORK: 1, CARRY: 1, MOVE: 2 };
        let fixed = { CARRY: 4, MOVE: (opts.roads ? 1 : 2) };
        if (opts.energy < 400) fixed = {};

        let maxMultiplier = 10;
        let multiplier = Math.floor(Math.min(maxMultiplier, (opts.energy - getBuildCost(fixed)) / getBuildCost(variable)));

        return buildToArray(mergeBuild(fixed, multiplyBuild(variable, multiplier)));
    }

    function buildDefender(opts) {
        opts = _.defaults(opts || {}, { energy: room.energyCapacityAvailable });

        let variable = { TOUGH: 0, ATTACK: 1, RANGED_ATTACK: 1, MOVE: 2 };
        if (opts.energy < 600) variable = { ATTACK: 1, MOVE: 1 };

        let fixed = { CARRY: 1, HEAL: 1, MOVE: 2 };
        if (opts.energy < 1200) fixed = {};

        let maxMultiplier = 5;
        let multiplier = Math.floor(Math.min(maxMultiplier, (opts.energy - getBuildCost(fixed)) / getBuildCost(variable)));

        return buildToArray(mergeBuild(fixed, multiplyBuild(variable, multiplier)));
    }

    function buildScout(opts) {
        opts = _.defaults(opts || {}, { claim: true, energy: room.energyCapacityAvailable });

        let build = { CLAIM: 2, MOVE: 2 };
        if (!opts.claim || opts.energy < getBuildCost(build)) {
            build = { MOVE: 1 };
        }

        return buildToArray(build);
    }

    function buildAttacker(opts) {
        opts = _.defaults(opts || {}, { heals: false, energy: room.energyCapacityAvailable });

        let heals = (!opts.heals ? 0 : Math.min(3, Math.floor(opts.energy / 1000)));

        let variable = { TOUGH: 0, MOVE: 1, ATTACK: 1 };
        let fixed = { MOVE: heals, HEAL: heals };

        let maxMultiplier = Math.floor((50 - getPartsCount(fixed)) / getPartsCount(variable));
        let multiplier = Math.min(maxMultiplier, Math.floor((opts.energy - getBuildCost(fixed)) / getBuildCost(variable)));

        return buildToArray(mergeBuild(fixed, multiplyBuild(variable, multiplier)));;
    }

    function buildHealer(opts) {
        opts = _.defaults(opts || {}, { claim: true, energy: room.energyCapacityAvailable });

        let build = { TOUGH: 0, RANGED_ATTACK: 0, HEAL: 1, MOVE: 1 };
        let maxMultiplier = Math.floor(50 / getPartsCount(build));
        let multiplier = Math.min(maxMultiplier, Math.floor(opts.energy / getBuildCost(build)));

        return buildToArray(multiplyBuild(build, multiplier));
    }

    function getPartsCount(body) {
        return _.sum(body);
    }

    function getBuildCost(body) {
        if (! (body instanceof Array)) body = buildToArray(body);
        return _.sum(body, (p) => BODYPART_COST[p]);
    }

    function mergeBuild(first, second) {
        return _.merge(first, second, (a, b) => (a || 0) + (b || 0));
    }

    function multiplyBuild(body, multiplier) {
        if (multiplier == 0) return {};
        _.forIn(body, (v,k) => { body[k] = v * multiplier });
        return body;
    }

    function buildToArray(build) {
        let  order = [TOUGH,CLAIM,WORK,CARRY,MOVE,ATTACK,RANGED_ATTACK,HEAL];
        return _.flatten(_.map(order, (p) => {
            return _.fill(Array(build[p.toUpperCase()] || 0), p)
        }));
    }

    return {
        buildWorkingHarvester: buildWorkingHarvester,
        buildHarvester: buildHarvester,
        buildMiner: buildMiner,
        buildHauler: buildHauler,
        buildLinker: buildLinker,
        buildBuilder: buildBuilder,
        buildUpgrader: buildUpgrader,
        buildDefender: buildDefender,
        buildScout: buildScout,
        buildAttacker: buildAttacker,
        buildHealer: buildHealer,
        printBuild: function(build) {
            let o = {};
            build.forEach(b => { o[b] = (o[b] || 0)+1 } );
            return '{ ' + _.map(_.keys(o), k => k + ':' + o[k]).join(", ") + ' }';
        }
    };
}