let  utils = require('components/utils');
let  Empire = require('components/empire');

module.exports = function(creep) {
    let empire = Empire();
    let room = creep.room;
    
    function pickupDropped() {
        let  dropped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
        if (dropped && dropped.length > 0) {
            creep.pickup(_.max(dropped, (r) => { return r.amount }));
        }
    }
    
    function repairOrBuild() {
        if (creep.getActiveBodyparts(WORK) == 0 || creep.carry[RESOURCE_ENERGY] == 0) return;
        
        let  constructs = creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3, { filter: (cs) => cs.structureType == STRUCTURE_ROAD });
        if (constructs && creep.build(constructs[0]) == 0) return;
        
        let  roads = creep.pos.lookFor(LOOK_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_ROAD && s.hits < s.hitsMax });
        if (roads && creep.repair(roads[0]) == 0) return;
    }
    
    function harvest(transferFrom, transferTo) {

        if (transferFrom instanceof Source || transferFrom instanceof Mineral) {
            let  drops = transferFrom.pos.findInRange(FIND_DROPPED_RESOURCES, 2, { filter: (r) => { return r.amount > 0; }});
            let  containers = transferFrom.pos.findInRange(FIND_STRUCTURES, 2, { 
                filter: (s) => { return s.structureType == STRUCTURE_CONTAINER && (creep.getActiveBodyparts(WORK) > 0 ? _.sum(s.store) > 0 : true) }});
                
            let  all = drops.concat(containers);
                
            if (all && all.length > 0) {
                transferFrom = _.max(all, (c) => { return (c instanceof StructureContainer ? c.store[RESOURCE_ENERGY] : c.amount )});
            }
        }
        
        let miners = creep.pos.findInRange(FIND_MY_CREEPS, 2, { filter: c => c.memory.role == 'miner' && !c.pos.isNearTo(transferFrom) });
        if (creep.pos.getRangeTo(transferFrom) < 3 && miners.length) {
            creep.moveTo(miners[0]); // stupid hauler, get out of the way
        } else if (!creep.pos.isNearTo(transferFrom)) {
            creep.moveTo(transferFrom, { maxRooms: (creep.room.name == transferFrom.room.name ? 1 : 16), maxOps: 10000, reusePath: 10, visualizePathStyle: { fill: 'transparent', stroke: '#fff', lineStyle: 'dashed', strokeWidth: .1, opacity: 0.2 }});
        } else {
            if (transferFrom instanceof Source) {
                creep.harvest(transferFrom, RESOURCE_ENERGY);
            } else if (transferFrom instanceof Resource) {
                creep.pickup(transferFrom);
            } else if (transferFrom instanceof StructureStorage && transferTo instanceof StructureTerminal) {
                if (transferFrom.store[RESOURCE_ENERGY] > storageLimit(RESOURCE_ENERGY)) {
                    creep.withdraw(transferFrom, RESOURCE_ENERGY)
                } else {
                    let maxResource = _.max(_.keys(transferFrom.store), r => transferFrom.store[r] - storageLimit(r));
                    if (transferFrom.store[maxResource] > storageLimit(maxResource)) {
                        creep.withdraw(transferFrom, maxResource);
                    }
                }
            } else if (transferFrom instanceof StructureTerminal && transferTo instanceof StructureStorage) {
                if (transferFrom.store[RESOURCE_ENERGY] > terminalLimit(RESOURCE_ENERGY)) {
                    creep.withdraw(transferFrom, RESOURCE_ENERGY)
                } else {
                    let maxResource = _.max(_.keys(transferFrom.store), r => transferFrom.store[r] - storageLimit(r));
                    if (transferFrom.store[maxResource] > terminalLimit(maxResource)) {
                        creep.withdraw(transferFrom, maxResource);
                    }
                }
            } else if (transferFrom instanceof StructureLink || transferFrom instanceof StructureStorage) {
                creep.withdraw(transferFrom, RESOURCE_ENERGY);
            } else if (transferFrom instanceof StructureContainer) {
                for (let resourceType in transferFrom.store) {
                    creep.withdraw(transferFrom, resourceType);
                }
            }
        }
    }
    
    function dump(transferTo) {
        if (_.sum(transferTo.store) + _.sum(creep.carry) >= transferTo.storeCapacity && transferTo.room.storage && transferTo.pos.getRangeTo(transferTo.room.storage) < 5) {
            transferTo = transferTo.room.storage;
        }
        
        if (transferTo instanceof StructureStorage && transferTo.room.terminal && _.sum(transferTo.room.terminal.store) < transferTo.room.terminal.storeCapacity) {
            let maxResource = _.max(_.keys(creep.carry), k => creep.carry[k]);
            let maxStored = storageLimit(maxResource)
            if (transferTo.store[maxResource] > maxStored) {
                transferTo = transferTo.room.terminal;
            }
        }
        
        if (creep.carry[RESOURCE_ENERGY] > 0) {
            let nearbyLinks = creep.pos.findStructureInRange(STRUCTURE_LINK, 3, { filter: l => { 
                return l.cooldown == 0 && l.energyCapacity - l.energy > 300 && l.pos.getRangeTo(l.room.storage) > 3; 
            } });
            if (nearbyLinks.length) {
                //console.log(creep.name, 'found nearby link: ', nearbyLinks[0]);
                transferTo = nearbyLinks[0];
            }
        }
        
        if (creep.pos.isNearTo(transferTo)) {
           for (let resourceType in creep.carry) {
                creep.transfer(transferTo, resourceType);
            } 
        } else {
            creep.moveTo(transferTo);
        }
    }
    
    function storageLimit(resourceType) {
        return empire.storageLimit(resourceType);
    }
    
    function terminalLimit(resourceType) {
        return empire.terminalLimit(resourceType);
    }
    
    function isBidirectional(transferFrom, transferTo) {
        return transferFrom instanceof StructureStorage && transferTo instanceof StructureTerminal
            || transferFrom instanceof StructureTerminal && transferTo instanceof StructureStorage;
    }
    
    function chooseDirection(transferFrom, transferTo) {
        let storage = (transferFrom instanceof StructureStorage ? transferFrom : transferTo);
        let terminal = (transferFrom instanceof StructureTerminal ? transferFrom : transferTo);
        
        let terminalHasCapacity = _.sum(terminal.store) < terminal.storeCapacity-5000;
        let storageHasCapacity = _.sum(storage.store) < storage.storeCapacity-5000;
        
        let terminalhasExcessEnergy = terminal.store[RESOURCE_ENERGY] > terminalLimit(RESOURCE_ENERGY);
        let storageHasExcessEnergy = storage.store[RESOURCE_ENERGY] > storageLimit(RESOURCE_ENERGY);
        
        let terminalhasExcess = _.some(terminal.store, r => terminal.store[r] > terminalLimit(r));
        let storageHasExcess = _.some(storage.store, r => storage.store[r] > storageLimit(r));
        
        if (!terminalHasCapacity) {
            creep.memory.transferFrom = terminal.id;
            creep.memory.transferTo = storage.id;
        } else if (!storageHasCapacity) {
            creep.memory.transferFrom = storage.id;
            creep.memory.transferTo = terminal.id;
        } else if (storageHasExcessEnergy) {
            creep.memory.transferFrom = storage.id;
            creep.memory.transferTo = terminal.id;
        } else if (terminalhasExcessEnergy) {
            creep.memory.transferFrom = terminal.id;
            creep.memory.transferTo = storage.id;
        } else if (storageHasExcess) {
            creep.memory.transferFrom = storage.id;
            creep.memory.transferTo = terminal.id;
        } else if (terminalhasExcess) {
            creep.memory.transferFrom = terminal.id;
            creep.memory.transferTo = storage.id;
        }
        
        //console.log('   ', creep.name, creep.memory.transferFrom == storage.id ? 'storage' : 'terminal', '->',
        //    creep.memory.transferTo == storage.id ? 'storage' : 'terminal');
    }
    
    return {
        run: function () {
            let transferFrom, transferTo;
            if (!creep.memory.transferFrom || !creep.memory.transferTo 
                || !(transferFrom = Game.getObjectById(creep.memory.transferFrom))
                || !(transferTo = Game.getObjectById(creep.memory.transferTo))) {
                console.log('Hauler ' + creep.name + ' (' + creep.memory.role + ') doesn\'t know what to do');
                return;
            }
            
            if (!creep.memory.state) state = creep.memory.state = 'harvest';
            
            pickupDropped();
            repairOrBuild();
            if (creep.memory.state == 'harvest') {
                harvest(transferFrom, transferTo);
            } else {
                dump(transferTo);
            }
            
            let carry = _.sum(creep.carry);
            if (carry >= creep.carryCapacity-10) {
                creep.memory.state = 'dump';
            } else if (carry <= creep.carryCapacity * 0.1) {
                if (isBidirectional(transferFrom, transferTo)) chooseDirection(transferFrom, transferTo);
                creep.memory.state = 'harvest';
            }
        }
    }
};