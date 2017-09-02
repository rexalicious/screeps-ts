module.exports = {
    run: function(creep, myRooms) {
        if ((creep.memory.cooldown-- || 0) > 0) return;

        let  target = Game.getObjectById(creep.memory.targetId);
        if (!target) {
            let  hostiles = _.flatten(_.map(_.values(myRooms), (r) => { return r.find(FIND_HOSTILE_CREEPS)}));
            
            let  closest = creep.pos.findClosestByRange(hostiles);
            if (!closest) {
                let  search = PathFinder.search(creep.pos, _.map(hostiles, (s) => { return { pos: s.pos, range: 1 } }));
                if (!search.incomplete && search.path.length > 0) {
                    let endPos = search.path[search.path.length - 1];
                    if (Game.rooms[endPos.roomName]) {
                        let  creeps = endPos.findInRange(FIND_HOSTILE_CREEPS, 1);
                        if (creeps.length) closest = creeps[0];
                    }
                }
            }
            
            target = closest;
            creep.memory.targetId = target;
        }
        
        if (target) {
            creep.memory.targetPos = { x: target.pos.x, y: target.pos.y, roomName: target.pos.roomName };
        }
        
        let  dropped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r) => { return r.resourceType != RESOURCE_ENERGY; }});
        if (dropped && dropped.length > 0) creep.pickup(_.max(dropped, (r) => { return r.amount }));
        
        if (target) {
            creep.moveTo(target);
            creep.rangedAttack(target);
            
            if (creep.pos.isNearTo(target)) {
                creep.attack(target);
            } else if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
            }
            
            console.log('Defender', creep.name, 'attacking target', target, target.pos);
        } else if (creep.memory.targetPos) {
            let  targetPos = new RoomPosition(creep.memory.targetPos.x, creep.memory.targetPos.y, creep.memory.targetPos.roomName);
            if (Game.rooms[creep.memory.targetPos.roomName]) {
                delete creep.memory.targetPos;
                console.log('Defender', creep.name, 'abandoning target');
            } else {
                creep.moveTo(targetPos);
                console.log('Defender', creep.name, 'moving to last known pos', targetPos);
            }
        } else {
            let  target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: function(object) {
                    return object.hits < object.hitsMax;
                }
            });
            if (target) {
                if(creep.heal(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                    creep.rangedHeal(target);
                }
            } else {
                let  storage = creep.room.storage;
                if (_.sum(creep.carry) > 0 && storage && storage.my && storage.isActive) {
                    if (!creep.pos.isNearTo(storage)) {
                        creep.moveTo(storage);
                    } else {
                        for(let resourceType in creep.carry) {
                            creep.transfer(storage, resourceType);
                        }
                    }
                } else {
                    let moved = false;
                    
                    let roomName = creep.memory.roomTarget || creep.memory.spawnRoom;
                    if (creep.room.name == roomName) {
                        let hostilecs = creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);
                        if (hostilecs.length) {
                            creep.attack(hostilecs[0]);
                            creep.moveTo(hostilecs[0]);
                            moved = true;
                        }
                    }
                    
                    if (!moved) {
                        let flag = Game.flags['defender-' + roomName];
                        let goal = (flag ? flag.pos : new RoomPosition(25, 25, roomName));
                        if (creep.pos.isNearTo(goal)) {
                            creep.memory.cooldown = 10 + Math.floor(Math.random() * 3);
                        } else {
                            creep.moveTo(goal);
                        }
                    }
                }
            }
        }
    }
};