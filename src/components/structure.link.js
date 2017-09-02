let  utils = require('components/utils');

module.exports = (link) => {
    function findStorageLink() {
        if (!link.room.storage) return;

        const  links = link.room.storage.pos.findStructureInRange(STRUCTURE_LINK, 2);
        if (links.length) return links[0];
    }

    function findControllerLink() {
        if (!link.room.controller) return;

        const  links = link.room.controller.pos.findStructureInRange(STRUCTURE_LINK, 2);
        if (links.length) return links[0];
    }

    function trySendToControllerLink(controllerLink) {
        if (controllerLink.energy < 0.5 * controllerLink.energyCapacity) {
            return OK === link.transferEnergy(controllerLink);
        }
    }

    function trySendToStorageLink(storageLink) {
        if (storageLink.energy < 0.5 * storageLink.energyCapacity) {
            return OK === link.transferEnergy(storageLink);
        }
    }

    return {
        run: () => {
            if (link.cooldown > 0) return;

            if (link.energy >= 0.5 * link.energyCapacity) {
                const controllerLink = findControllerLink() || {};
                const storageLink = findStorageLink() || {};

                if (link.id === controllerLink.id || link.id === storageLink.id) return;

                trySendToControllerLink(controllerLink) || trySendToStorageLink(storageLink);
            }
        }
    };
};
