import * as cache from "components/cache";

module.exports = () => {
    function encodePath(path: RoomPosition[]) {
        // tslint:disable-next-line:arrow-return-shorthand
        return _.map(path, (p) => { return { x: p.x, y: p.y, roomName: p.roomName }; });
    }

    function decodePath(path: RoomPosition[]) {
        return _.map(path, (p) => new RoomPosition(p.x, p.y, p.roomName));
    }

    function getMiningRoute(startPos: RoomPosition, endPos: RoomPosition) {
        const key = ["paths-mining-route", startPos.x, startPos.y, startPos.roomName,
                    endPos.x, endPos.y, endPos.roomName].join("-");

        return cache.getset(key, 1000, () => {
            const pathfinder = PathFinder.search(startPos, [ { pos: endPos, range: 1 } ],
            { plainCost: 2, swampCost: 3, roomCallback: (roomName) => {
                const room = Game.rooms[roomName];
                if (!room) return false;
                const costs = new PathFinder.CostMatrix();

                room.find<ConstructionSite>(FIND_CONSTRUCTION_SITES).forEach((cs) => {
                   if (cs.structureType === STRUCTURE_ROAD) {
                       costs.set(cs.pos.x, cs.pos.y, 1);
                   }
                });

                room.find<Structure>(FIND_STRUCTURES).forEach((struct) => {
                  if (struct.structureType === STRUCTURE_ROAD) {
                    costs.set(struct.pos.x, struct.pos.y, 1);
                  } else if (!(struct instanceof StructureContainer)
                          && !(struct instanceof StructureRampart && struct.my)) {
                    costs.set(struct.pos.x, struct.pos.y, 0xff);
                  }
                });
                return costs;
            } });

            if (pathfinder.incomplete) console.log("INCOMPLETE PATH", startPos, endPos);

            return pathfinder.path;
        }, encodePath, decodePath);
    }

    return {
        getMiningRoute
    };
};
