import * as cache from "components/cache";

module.exports = {
    moveToClosestContainerOrSource: (creep: Creep, amount = 0, cacheTicks = 3) => {
        const key = "closestSource-" + creep.name + "-" + amount;
        const closestId = cache.getset(key, cacheTicks, () => {
            const drops = creep.room.find<Resource>(FIND_DROPPED_RESOURCES, {
                filter: (r: Resource) => r.resourceType === RESOURCE_ENERGY && r.amount > amount });
            const containers = creep.room.find<Structure>(FIND_STRUCTURES, {
                filter: (s: Structure) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE)
                                       && (s as StructureContainer | StructureStorage).store[RESOURCE_ENERGY] > amount });
            const links = creep.room.find<Structure>(FIND_STRUCTURES, {
                filter: (s: Structure) => (s.structureType === STRUCTURE_LINK && (s as StructureLink).energy > amount)
            });

            let all: any[] = [];
            all = all.concat(drops, containers, links);

            const container = creep.pos.findClosestByPath<Structure | Resource>(all, { maxRooms: 1 });
            if (container) return container.id;

            const source = creep.pos.findClosestByPath<Source>(FIND_SOURCES, { maxRooms: 1 });
            if (source) return source.id;
        });

        const closest = Game.getObjectById<RoomObject>(closestId);

        if (closest) {
            let energyRemaining = 0;
            if (closest instanceof StructureStorage) energyRemaining = closest.store[RESOURCE_ENERGY] || 0;
            if (closest instanceof StructureContainer) energyRemaining = closest.store[RESOURCE_ENERGY] || 0;
            if (closest instanceof StructureLink) energyRemaining = closest.energy;
            if (closest instanceof Resource) energyRemaining = closest.amount;

            if (!energyRemaining || energyRemaining < amount) cache.delete(key);

            if (!creep.pos.isNearTo(closest)) {
                creep.moveTo(closest, { maxRooms: 1 });
            } else {
                if (closest instanceof Structure) {
                    creep.withdraw(closest, RESOURCE_ENERGY);
                    cache.delete(key);
                } else if (closest instanceof Resource) {
                    creep.pickup(closest);
                    cache.delete(key);
                } else if (closest instanceof Source) {
                    creep.harvest(closest);
                }
            }
        }
    }
};

declare global {
    interface Room {
        findStructures<T>(structureTypes: string | string[], opts?: any): T[];
    }
}

Room.prototype.findStructures = function<T>(structureTypes: string | string[], opts: any = {}) {
    if (structureTypes instanceof String) structureTypes = [structureTypes];
    if (!opts.filter) opts.filter = () => true;

    const _f = opts.filter;
    opts.filter = (o: Structure) => (structureTypes as string[]).includes(o.structureType) && _f(o);

    return this.find(FIND_STRUCTURES, opts) as T[];
};

declare global {
    interface RoomPosition {
        findStructureInRange<T>(structureType: string, range: number, opts?: any): T[];
    }
}

RoomPosition.prototype.findStructureInRange = function<T>(structureType: string, range: number, opts: any = {}) {
    if (!opts.filter) opts.filter = () => true;

    const  _f = opts.filter;
    opts.filter = (o: Structure) => o.structureType === structureType && _f(o);

    return this.findInRange(FIND_STRUCTURES, range, opts) as T[];
};
