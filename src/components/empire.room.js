let Builds = require('utils.builds');
let CreepQueue = require('empire.room.creep-queue');
let Paths = require('empire.paths');
let cache = require('cache');

module.exports = function(room, satellites) {
    let spawns = room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_SPAWN });
    let creeps = _.filter(_.values(Game.creeps), (c) => { return c.memory.spawnRoom == room.name });
    
    let builds = new Builds(room);
    let paths = new Paths();
    
    function getCreepQueue() {
        let cacheTicks = 1;
        return cache.getset(room.name + '-creep-queue', cacheTicks, () => {
            return new CreepQueue(room, satellites).get()
        });
    }
    
    function trueRole(roleName) {
        if (roleName.startsWith('hauler')) return 'hauler';
        if (roleName.startsWith('longhauler')) return 'hauler';
        if (roleName.startsWith('scout')) return 'scout';
        return roleName;
    }
    
    let creepIndex = 0;
    let creepQueue;
    function spawnNext(spawn) {

        if (!creepQueue) creepQueue = getCreepQueue();
        for( ; creepIndex < creepQueue.length; creepIndex++) {
            let memory = creepQueue[creepIndex];
            
            // do we have it?
            if (haveCreep(memory)) {
                //console.log(spawn.name, '       already have', memory.role, memory.transferFrom || memory.roomTarget || memory.sourceId || '');
                continue;
            }
            
            // okay, spawn it
            let build = getBuild(memory);
            console.log(spawn.name, 'spawning', memory.role, memory.transferFrom || memory.roomTarget || memory.sourceId || '', builds.printBuild(build));
            creepIndex++;
            
            memory.spawnRoom = room.name;
            let err = spawn.canCreateCreep(build);
            if (err == OK) {
                spawn.createCreep(build, undefined, memory);
                return true;
            } else {
                console.log('Cannot create creep: ', err);
            }
            
            return false;
        }
    }
    
    function haveCreep(memory) {
        let creepsRemaining = _.filter(creeps, c => (c.spawning || c.ticksToLive > 100) && !c.marked);
        
        // get all the matching creeps
        let matching = _.filter(creepsRemaining, (c) => {
            for (var key in memory) {
                let val = (key == 'role' ? trueRole(c.memory[key]) : c.memory[key]);
                if (!_.isEqual(memory[key], val)) return false;
            }
            // hack for now
            if ('roomTarget' in c.memory && c.memory.roomTarget != memory.roomTarget) return false;
            
            return true;
        });
        
        if (matching.length == 0) return false;
        
        // don't count the same creep twice
        matching[0].marked = true;
        return true;
    }
    
    function getHaulerRoute(from, to, createRoads) {
        if (!from || !to) return;
        
        let path = paths.getMiningRoute(from.pos, to.pos);
        let ctConstructionSites = _.keys(Game.constructionSites).length;
        let roads = true;
        _.forEach(path, pos => { 
            // can't build roads on edges
            if (pos.x == 0 || pos.x == 49 || pos.y == 0 || pos.y == 49) return;
            
            let looks = pos.look();
            if (looks.length) {
                let road = _.any(looks, (l) => l.type == LOOK_STRUCTURES && l.structure instanceof StructureRoad);
                if (!road) roads = false;
                //if (!road) console.log('no road at ', pos);
                if (!road && createRoads && !_.any(looks, l => l.type == LOOK_CONSTRUCTION_SITES && l.structureType == STRUCTURE_ROAD)) {
                    if (ctConstructionSites < 80) {
                        ctConstructionSites += (pos.createConstructionSite(STRUCTURE_ROAD) == OK ? 1 : 0);
                    }
                }
            }
        });
        
        return { path: path, distance: path.length, roads: roads }
    }
    
    function getBuild(memory) {
        let build;
        switch (memory.role) {
            case 'harvester': 
                let harvesters = _.filter(creeps, c => c.memory.role == 'harvester');
                let miners = _.filter(creeps, c => c.memory.role == 'miners');
                if (harvesters.length == 0 && miners.length == 0) {
                    build = builds.buildWorkingHarvester( { energy: room.energyAvailable } );
                } else {
                    build = builds.buildHarvester({ roads: true });  
                }
                break;
            case 'miner': 
                let source = Game.getObjectById(memory.sourceId);
                let resourceType = (source && source instanceof Mineral ? source.mineralType : RESOURCE_ENERGY);
                build = builds.buildMiner({ resourceType: resourceType });
                break;
            case 'hauler':
                if (memory.mission == 'terminal') {
                     memory.transferFrom = room.storage.id;
                     memory.transferTo = room.terminal.id;
                }
                
                if (!memory.transferFrom || !memory.transferTo) {
                    let storage = room.storage || spawns[0].pos.findClosestByRange(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER });
                    if (!storage) console.log('NO STORAGE FOUND', room.name);
                    if (!memory.transferFrom)  memory.transferFrom = storage.id;
                    else if (!memory.transferTo) memory.transferTo = storage.id;
                }
                
                if (!memory.transferFrom || !memory.transferTo) {
                    console.log('BAD HAULER'); return;
                }
                
                let transferFrom = Game.getObjectById(memory.transferFrom);
                let transferTo = Game.getObjectById(memory.transferTo);
                let path = getHaulerRoute(transferFrom, transferTo, true);
                let distance = (path ? path.distance : 50);
                let roads = (path ? path.roads : false);
                let harvestRate = 10; // todo: not accurate for minerals
                if (transferFrom instanceof StructureStorage) harvestRate = 500;
                
                let work = (roads ? 1 : 3);
                if (transferFrom && transferTo && transferFrom.room.name == room.name && transferTo.room.name == room.name) work = 0;
                
                //console.log('hauler', distance, work, roads, harvestRate);
                build = builds.buildHauler({ distance: distance, work: work, roads: roads, harvestRate: harvestRate });
                break;
            case 'linker':
                memory.transferTo = room.storage.id;
                if (!room.storage) console.log('NO STORAGE FOUND', room.name);
                build = builds.buildLinker();
                break;
            case 'builder':
                build = builds.buildBuilder();
                break;
            case 'upgrader':
                build = builds.buildUpgrader({ roads: true });
                break;
            case 'defender':
                build = builds.buildDefender();
                break;
            case 'attacker':
                build = builds.buildAttacker();
                break;
            case 'healer':
                build = builds.buildHealer();
                break;
            case 'scout':
                let rt = Game.rooms[memory.roomTarget];
                let claim = !(rt && rt.controller && rt.controller.reservation && rt.controller.reservation.ticksToEnd > CREEP_LIFE_TIME);
                build = builds.buildScout({ claim: claim });
                break;
            default: 
                console.log('UNKNOWN ROLE TO SPAWN:', needs.role);
        }
        
        return build;
    }
        
    return {
        run: function() {
            if (room.name == 'E13N17') {
                //console.log(builds.printBuild(builds.buildHealer()));
            }
            spawns.forEach(spawn => {
                if (spawn.memory.cooldown > 0) spawn.memory.cooldown--;
                if (!spawn.spawning && !spawn.memory.cooldown) {
                    if (!spawnNext(spawn)) {
                        spawn.memory.cooldown = 10;
                    }
                }
                
                if(spawn.spawning) {
                    var spawningCreep = Game.creeps[spawn.spawning.name];
                    spawn.room.visual.text(
                        '🛠 ️' + spawningCreep.memory.role,
                        spawn.pos.x + 1,
                        spawn.pos.y,
                        {align: 'left', opacity: 0.8});
                }
            });
        }
    }
}